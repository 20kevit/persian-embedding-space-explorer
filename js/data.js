/**
 * data.js — Data access layer over EMBEDDING_DATA global
 */

const data = window.EMBEDDING_DATA;
const wordIndex = {};
const wordCount = data.words.length;

// Build word → index lookup
for (let i = 0; i < wordCount; i++) {
    wordIndex[data.words[i].toLowerCase()] = i;
}

// Category colors (matching CSS)
const categoryColors = {
    nature:     { r: 0.0, g: 1.0, b: 0.53 },
    technology: { r: 0.0, g: 0.96, b: 1.0 },
    people:     { r: 1.0, g: 0.0, b: 0.67 },
    emotion:    { r: 0.96, g: 1.0, b: 0.0 },
    action:     { r: 1.0, g: 0.55, b: 0.0 },
    science:    { r: 0.63, g: 0.39, b: 1.0 },
    place:      { r: 1.0, g: 0.39, b: 0.39 },
    time:       { r: 0.39, g: 0.78, b: 1.0 },
    food:       { r: 1.0, g: 0.71, b: 0.2 },
    body:       { r: 1.0, g: 0.55, b: 0.71 },
    abstract:   { r: 0.78, g: 0.78, b: 1.0 },
    general:    { r: 0.59, g: 0.59, b: 0.67 },
};

const colorArray = data.categoryNames.map(name => categoryColors[name] || categoryColors.general);

const EmbeddingStore = {
    count: wordCount,

    getWord(i) {
        return data.words[i];
    },

    getPosition(i) {
        const idx = i * 3;
        return {
            x: data.positions[idx],
            y: data.positions[idx + 1],
            z: data.positions[idx + 2]
        };
    },

    getPositionArray() {
        return data.positions;
    },

    getCategory(i) {
        return data.categories[i];
    },

    getCategoryName(i) {
        return data.categoryNames[data.categories[i]];
    },

    getCategoryNames() {
        return data.categoryNames;
    },

    getCategoryColor(i) {
        return colorArray[data.categories[i]];
    },

    getNeighbors(i) {
        return data.neighbors[i];
    },

    getVector(i) {
        const start = i * data.vectorDim;
        return Array.prototype.slice.call(data.vectors, start, start + data.vectorDim);
    },

    getAnalogies() {
        return data.analogies;
    },

    lookup(word) {
        const idx = wordIndex[word.toLowerCase()];
        return idx !== undefined ? idx : -1;
    },

    search(prefix) {
        if (!prefix || prefix.length === 0) return [];
        prefix = prefix.toLowerCase();
        const results = [];
        for (let i = 0; i < wordCount && results.length < 8; i++) {
            if (data.words[i].toLowerCase().indexOf(prefix) === 0) {
                results.push(i);
            }
        }
        return results;
    },

    colorArray,
    categoryColors
};

export default EmbeddingStore;
