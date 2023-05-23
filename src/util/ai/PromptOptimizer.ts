import { CommonModelType } from "../Constants";
import unidecode from "unidecode";

const STOPWORDS = [
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "you're", "you've",
    "you'll", "you'd", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself",
    "she", "she's", "her", "hers", "herself", "it", "it's", "its", "itself", "they", "them", "their",
    "theirs", "themselves", "what", "which", "who", "whom", "this", "that", "that'll", "these",
    "those", "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because",
    "as", "until", "while", "of", "at", "by", "for", "with", "about", "against", "between", "into",
    "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in",
    "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there",
    "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other",
    "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t",
    "can", "will", "just", "don", "don't", "should", "should've", "now", "d", "ll", "m", "o", "re", "ve",
    "y", "ain", "aren", "aren't", "couldn", "couldn't", "didn", "didn't", "doesn", "doesn't", "hadn",
    "hadn't", "hasn", "hasn't", "haven", "haven't", "isn", "isn't", "ma", "mightn", "mightn't", "mustn",
    "mustn't", "needn", "needn't", "shan", "shan't", "shouldn", "shouldn't", "wasn", "wasn't", "weren",
    "weren't", "won", "won't", "wouldn", "wouldn't", 
];

const NEGATION_WORDS = [
    "no", "nor", "not", "don", "dont", "ain", "aren", "arent", "couldn", "couldnt", "didn", "didnt", "doesn",
    "doesnt", "hadn", "hadnt", "hasn", "hasnt", "haven", "havent", "isn", "isnt", "mightn", "mightnt", "mustn",
    "mustnt", "needn", "neednt", "shan", "shant", "shouldn", "shouldnt", "wasn", "wasnt", "weren", "werent",
    "won", "wont", "wouldn", "wouldnt",
];

export class PromptOptimizer {
    /**
     * Optimizes the prompt using gptrim algorithm
     */
    static gptrim(prompt: string): string {
        return prompt
            .replace(/-/g, " ").replace(/[.,'"!?;:]/g, "")
            .replace(/ {2,}/g, " ").split(/\s+/g)
            .filter(x => !STOPWORDS.includes(x.toLowerCase()) || NEGATION_WORDS.includes(x.toLowerCase()))
            .join(" ");
    }
}