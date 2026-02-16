#!/usr/bin/env python3
"""
Generate 3D embedding positions from GloVe 6B 50d vectors using UMAP.
Outputs data/embeddings.js for the Embedding Space Explorer.

Usage:
    pip install numpy umap-learn
    python preprocess/generate_embeddings.py
"""

import os
import zipfile
import urllib.request
import numpy as np

GLOVE_URL = "https://nlp.stanford.edu/data/glove.6B.zip"
GLOVE_DIR = os.path.join(os.path.dirname(__file__), "glove_data")
GLOVE_ZIP = os.path.join(GLOVE_DIR, "glove.6B.zip")
GLOVE_FILE = os.path.join(GLOVE_DIR, "glove.6B.50d.txt")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "embeddings.js")

NUM_WORDS = 5000

# Stopwords and short words to filter out
STOPWORDS = set("""
the be to of and a in that have i it for not on with he as you do at this but his by
from they we say her she or an will my one all would there their what so up out if about
who get which go me when make can like time no just him know take people into year your
good some could them see other than then now look only come its over think also back after
use two how our work first well way even new want because any these give day most us is
was are were been has had did does doing am been being than more very also own same each
de la le el en un los las el que se del lo al por una es con para no una los las
""".split())

# Category word lists for color coding
CATEGORY_WORDS = {
    "nature": """
        tree forest river ocean mountain lake rain snow sun moon star sky cloud wind
        flower garden plant seed leaf root grass field earth stone rock sand water ice
        bird fish wolf bear deer horse dog cat lion tiger eagle hawk whale shark dolphin
        spring summer autumn winter storm thunder lightning rainbow sunrise sunset valley
        hill island desert jungle reef coral petal bloom soil mud clay volcano earthquake
        fox rabbit owl butterfly bee ant spider snake frog turtle insect mushroom pine oak
        pond creek stream waterfall glacier tide wave coast shore beach cliff cave
    """,
    "technology": """
        computer software hardware internet network server database code program algorithm
        digital robot machine engine device phone screen keyboard mouse chip processor
        memory disk drive data byte pixel signal wire cable battery electric electronic
        laptop desktop monitor printer scanner camera sensor circuit board silicon chip
        app website browser download upload cloud storage virtual online digital wireless
        bluetooth wifi satellite radar laser fiber cable modem router switch hub protocol
        binary encrypt decrypt hack virus malware firewall proxy cache buffer compile debug
        api framework library module plugin widget dashboard interface login password
        startup silicon automation drone quantum blockchain crypto bitcoin token mining
    """,
    "people": """
        man woman child baby boy girl mother father brother sister family friend teacher
        student doctor nurse lawyer judge police soldier king queen prince princess wife
        husband son daughter uncle aunt cousin grandfather grandmother neighbor stranger
        captain president minister governor mayor chief boss manager leader coach mentor
        artist musician singer actor dancer writer poet painter author photographer chef
        scientist engineer architect driver pilot farmer worker employee citizen voter
        hero villain victim warrior knight monk priest nun bishop pope saint angel devil
    """,
    "emotion": """
        love hate fear anger joy sadness happiness peace hope faith trust pride shame
        guilt envy jealousy surprise disgust anxiety worry stress calm excitement wonder
        beauty ugly pain pleasure comfort desire passion courage brave lonely alone free
        happy sad angry afraid scared nervous anxious excited grateful thankful proud
        ashamed embarrassed confused frustrated disappointed satisfied content peaceful
        cheerful gloomy depressed miserable delighted thrilled terrified horrified
        amused bored curious eager enthusiastic optimistic pessimistic sympathetic
    """,
    "action": """
        run walk jump climb swim fly drive ride throw catch push pull lift carry drop
        kick punch hit cut break build create destroy fight kill save help give take
        bring send move stop start open close turn hold touch feel hear see look watch
        speak talk say tell write read sing play dance cook eat drink sleep wake work
        try learn teach grow change win lose find search hide show lead follow escape
        attack defend protect guard hunt chase capture release grab reach stretch bend
    """,
    "science": """
        atom molecule cell gene dna protein virus bacteria evolution species organism
        element hydrogen oxygen carbon nitrogen iron gold silver copper uranium gravity
        energy force mass velocity acceleration momentum pressure temperature heat light
        sound wave particle photon electron proton neutron nucleus orbit magnetic electric
        chemical reaction equation formula experiment hypothesis theory law principle
        biology chemistry physics mathematics astronomy geology ecology genetics medicine
        microscope telescope lens spectrum frequency wavelength radiation emission
        fossil mineral crystal compound mixture solution acid base catalyst enzyme
    """,
    "place": """
        city town village house home building school church hospital office store shop
        park road street bridge tower castle palace temple museum library theater stadium
        airport station port harbor market square garden farm factory prison camp base
        room kitchen bedroom bathroom floor wall ceiling door window roof gate fence
        america europe asia africa australia china japan india russia france germany
        england italy spain brazil mexico canada london paris tokyo york berlin rome
        washington chicago angeles francisco boston seattle miami houston dallas denver
    """,
    "time": """
        second minute hour day week month year decade century morning afternoon evening
        night today tomorrow yesterday monday tuesday wednesday thursday friday saturday
        sunday january february march april may june july august september october november
        december past present future history ancient modern recent early late beginning
        end forever always never sometimes often usually rarely occasionally meanwhile
        deadline schedule calendar clock watch timer alarm dawn dusk midnight noon
    """,
    "food": """
        bread rice pasta meat chicken beef pork fish egg cheese milk butter cream sugar
        salt pepper sauce soup salad fruit apple orange banana grape lemon strawberry
        vegetable potato tomato onion carrot corn bean pepper lettuce mushroom olive
        cake pie cookie chocolate candy ice cream coffee tea juice wine beer water meal
        breakfast lunch dinner snack dessert pizza burger sandwich steak fries chips
        wheat flour grain cereal oat barley rye corn rice noodle dumpling sushi taco
    """,
    "body": """
        head face eye nose mouth ear hair neck shoulder arm hand finger thumb chest
        stomach back hip leg knee foot toe skin bone muscle blood heart brain lung liver
        kidney nerve vein artery skull spine rib jaw tongue tooth lip cheek chin forehead
        eyebrow eyelash elbow wrist palm nail ankle heel bone joint tissue organ cell
        breath pulse beat rhythm strength flexible balance posture gesture movement
    """,
    "abstract": """
        idea thought mind soul spirit truth lie fact fiction reality dream memory
        knowledge wisdom intelligence reason logic sense meaning purpose value worth
        power control freedom justice equality right wrong good evil moral virtue sin
        beauty art music culture language word name number color shape form pattern
        system order chaos balance harmony conflict war peace life death birth growth
        nature universe space time energy matter information theory model concept
        philosophy religion science law politics economy society technology education
    """,
}

def download_glove():
    """Download GloVe vectors if not already cached."""
    os.makedirs(GLOVE_DIR, exist_ok=True)
    if os.path.exists(GLOVE_FILE):
        print(f"GloVe file already exists: {GLOVE_FILE}")
        return
    if not os.path.exists(GLOVE_ZIP):
        print(f"Downloading GloVe 6B from {GLOVE_URL}...")
        print("(This is ~862MB and may take a few minutes)")
        urllib.request.urlretrieve(GLOVE_URL, GLOVE_ZIP, reporthook=_progress)
        print()
    print("Extracting glove.6B.50d.txt...")
    with zipfile.ZipFile(GLOVE_ZIP, 'r') as zf:
        # Only extract the 50d file
        zf.extract("glove.6B.50d.txt", GLOVE_DIR)
    print("Done extracting.")

def _progress(count, block_size, total_size):
    pct = count * block_size * 100 // total_size
    print(f"\r  {pct}% ({count * block_size // (1024*1024)}MB / {total_size // (1024*1024)}MB)", end="", flush=True)

def load_glove(path, max_words=50000):
    """Load GloVe vectors, returning words and vectors arrays."""
    print(f"Loading GloVe vectors from {path}...")
    words = []
    vectors = []
    with open(path, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if i >= max_words:
                break
            parts = line.strip().split()
            word = parts[0]
            vec = np.array([float(x) for x in parts[1:]], dtype=np.float32)
            words.append(word)
            vectors.append(vec)
    vectors = np.array(vectors)
    print(f"  Loaded {len(words)} words with {vectors.shape[1]}d vectors")
    return words, vectors

def filter_words(words, vectors, target_count=NUM_WORDS):
    """Filter to good alpha words, keeping top N by GloVe frequency rank."""
    print("Filtering words...")
    keep = []
    for i, w in enumerate(words):
        if len(w) < 2:
            continue
        if not w.isalpha():
            continue
        if w.lower() in STOPWORDS:
            continue
        keep.append(i)
        if len(keep) >= target_count:
            break
    indices = np.array(keep)
    filtered_words = [words[i] for i in indices]
    filtered_vectors = vectors[indices]
    print(f"  Kept {len(filtered_words)} words after filtering")
    return filtered_words, filtered_vectors

def assign_categories(words):
    """Assign each word a category index based on hardcoded word lists."""
    # Build lookup: word -> category index
    cat_names = list(CATEGORY_WORDS.keys()) + ["general"]
    word_to_cat = {}
    for ci, (cat, wordlist) in enumerate(CATEGORY_WORDS.items()):
        for w in wordlist.split():
            w = w.strip().lower()
            if w:
                word_to_cat[w] = ci
    general_idx = len(CATEGORY_WORDS)
    categories = []
    for w in words:
        categories.append(word_to_cat.get(w.lower(), general_idx))
    cat_counts = {}
    for c in categories:
        cat_counts[cat_names[c]] = cat_counts.get(cat_names[c], 0) + 1
    print("  Category distribution:")
    for name, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"    {name}: {count}")
    return categories, cat_names

def compute_umap(vectors):
    """Run UMAP to reduce to 3D."""
    import umap
    print("Running UMAP (n_components=3, n_neighbors=15, min_dist=0.1)...")
    print("  This may take a minute...")
    reducer = umap.UMAP(
        n_components=3,
        n_neighbors=15,
        min_dist=0.1,
        metric='cosine',
        random_state=42,
        verbose=True
    )
    positions_3d = reducer.fit_transform(vectors)
    # Normalize to [-50, 50]
    for dim in range(3):
        col = positions_3d[:, dim]
        mn, mx = col.min(), col.max()
        positions_3d[:, dim] = (col - mn) / (mx - mn) * 100 - 50
    print(f"  UMAP complete. Position range: [{positions_3d.min():.1f}, {positions_3d.max():.1f}]")
    return positions_3d

def compute_neighbors(vectors, k=10):
    """Find k nearest neighbors for each word using cosine similarity."""
    print(f"Computing {k} nearest neighbors for each word...")
    # Normalize vectors for cosine similarity
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normed = vectors / norms
    # Compute in batches to avoid memory issues
    n = len(vectors)
    neighbors = []
    batch_size = 500
    for start in range(0, n, batch_size):
        end = min(start + batch_size, n)
        sims = normed[start:end] @ normed.T  # (batch, n)
        for i in range(end - start):
            row = sims[i]
            row[start + i] = -1  # exclude self
            top_k = np.argsort(row)[-k:][::-1].tolist()
            neighbors.append(top_k)
        if end % 1000 == 0 or end == n:
            print(f"  {end}/{n}")
    return neighbors

def compute_analogies(words, vectors):
    """Compute vector arithmetic examples."""
    print("Computing analogy examples...")
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normed = vectors / norms

    word_to_idx = {w.lower(): i for i, w in enumerate(words)}

    analogies_spec = [
        ("king", "man", "woman", "queen"),
        ("paris", "france", "italy", "rome"),
        ("walked", "walk", "swim", "swam"),
        ("bigger", "big", "small", "smaller"),
    ]

    analogies = []
    for a_word, b_word, c_word, expected in analogies_spec:
        ai = word_to_idx.get(a_word)
        bi = word_to_idx.get(b_word)
        ci = word_to_idx.get(c_word)
        ei = word_to_idx.get(expected)
        if ai is None or bi is None or ci is None:
            print(f"  Skipping {a_word}-{b_word}+{c_word}: missing word")
            continue
        # result_vec = vector(a) - vector(b) + vector(c)
        result_vec = vectors[ai] - vectors[bi] + vectors[ci]
        # Find nearest word to result
        result_norm = result_vec / (np.linalg.norm(result_vec) + 1e-10)
        sims = normed @ result_norm
        # Exclude input words
        for idx in [ai, bi, ci]:
            sims[idx] = -1
        found_idx = int(np.argmax(sims))
        found_word = words[found_idx]
        print(f"  {a_word} - {b_word} + {c_word} = {found_word} (expected: {expected})")
        analogies.append({
            "a": ai, "b": bi, "c": ci,
            "result": found_idx,
            "label": f"{a_word} − {b_word} + {c_word} = {found_word}",
            "expected": expected,
        })
    return analogies

def export_js(words, positions, categories, cat_names, neighbors, vectors, analogies, path):
    """Export everything as a JS file with EMBEDDING_DATA global."""
    print(f"Exporting to {path}...")
    os.makedirs(os.path.dirname(path), exist_ok=True)

    lines = []
    lines.append("// Auto-generated by preprocess/generate_embeddings.py")
    lines.append("// GloVe 6B 50d → UMAP 3D positions for ~5000 words")
    lines.append("// Do not edit manually.")
    lines.append("")
    lines.append("var EMBEDDING_DATA = {")

    # Words array
    lines.append("  words: [")
    for i in range(0, len(words), 20):
        chunk = words[i:i+20]
        lines.append("    " + ",".join(f'"{w}"' for w in chunk) + ",")
    lines.append("  ],")

    # Positions: flat array [x0,y0,z0, x1,y1,z1, ...]
    lines.append("  positions: new Float32Array([")
    for i in range(0, len(positions), 10):
        chunk = positions[i:i+10]
        vals = []
        for p in chunk:
            vals.extend([f"{p[0]:.3f}", f"{p[1]:.3f}", f"{p[2]:.3f}"])
        lines.append("    " + ",".join(vals) + ",")
    lines.append("  ]),")

    # Categories: array of ints
    lines.append("  categories: new Uint8Array([")
    for i in range(0, len(categories), 40):
        chunk = categories[i:i+40]
        lines.append("    " + ",".join(str(c) for c in chunk) + ",")
    lines.append("  ]),")

    # Category names
    lines.append("  categoryNames: [" + ",".join(f'"{n}"' for n in cat_names) + "],")

    # Neighbors: array of arrays
    lines.append("  neighbors: [")
    for i, nbrs in enumerate(neighbors):
        lines.append("    [" + ",".join(str(n) for n in nbrs) + "],")
    lines.append("  ],")

    # 50d vectors for arithmetic (flat Float32Array)
    lines.append("  vectors: new Float32Array([")
    for i in range(0, len(vectors), 5):
        chunk = vectors[i:i+5]
        vals = []
        for v in chunk:
            vals.extend([f"{x:.4f}" for x in v])
        lines.append("    " + ",".join(vals) + ",")
    lines.append("  ]),")

    lines.append("  vectorDim: 50,")

    # Analogies
    lines.append("  analogies: [")
    for a in analogies:
        lines.append(f'    {{a:{a["a"]},b:{a["b"]},c:{a["c"]},result:{a["result"]},label:"{a["label"]}",expected:"{a["expected"]}"}},')
    lines.append("  ],")

    lines.append("};")

    with open(path, 'w') as f:
        f.write("\n".join(lines) + "\n")

    size_mb = os.path.getsize(path) / (1024 * 1024)
    print(f"  Written {path} ({size_mb:.1f} MB)")

def main():
    download_glove()
    words, vectors = load_glove(GLOVE_FILE)
    words, vectors = filter_words(words, vectors)
    categories, cat_names = assign_categories(words)
    positions = compute_umap(vectors)
    neighbors = compute_neighbors(vectors)
    analogies = compute_analogies(words, vectors)
    export_js(words, positions, categories, cat_names, neighbors, vectors, analogies, OUTPUT_FILE)
    print("\nDone! Open index.html to explore the embedding space.")

if __name__ == "__main__":
    main()
