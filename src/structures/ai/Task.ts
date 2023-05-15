export enum TaskType {
    Unknown = "unknown",
    SearchWeb = "search_internet",
    SearchResults = "search_results",
    WebsiteResponse = "website_response",
    UploadImage = "upload_image",
    AskQuestion = "ask_question",
    SaveMemory = "save_memory",
    DeleteMemory = "delete_memory",
    GetMemory = "get_memory",
    MemoryData = "memory_data"
}

/*
    "1. \"search_internet\" - { \"type\": \"search_internet\", \"parameters\": { \"query\": \"your search query\" } }\n",
    "2. \"search_results\" - { \"type\": \"search_results\", \"parameters\": { \"results\": [ \"an array of search results, or undefined if no results were found\" ] } }\n",
    "3. \"view_website\" - { \"type\": \"view_website\", \"parameters\": { \"query\": \"your query\", \"website\": \"website to visit\" } }\n",
    "4. \"website_response\" - { \"type\": \"website_response\", \"parameters\": { \"html\": \"the html of the website you had just searched\" } }\n",
    "5. \"upload_image\" - { \"type\": \"upload_image\", \"parameters\": { \"query\": \"a text describing the image(s) that were just uploaded\" } }\n",
    "6. \"ask_question\" - { \"type\": \"ask_question\", \"parameters\": { \"question\" \"the question you want to ask the user\" } }\n",
    "7. \"save_memory\" - { \"type\": \"save_memory\", \"parameters\": { data: { \"the information you want to save, typically an object\" } }\n",
    "8. \"delete_memory\" - { \"type\": \"save_memory\", \"parameters\": { data: [ \"an array of the ids of the memories you want to delete\" ] }\n",
    "9. \"get_memory\" - { \"type\": \"get_memory\", \"parameters\": undefined }\n",
    "10. \"memory_data\" - { \"type\": \"memory_data\", \"parameters\": { data: [ \"an array of the memories you have of this user or content you requested\" ]\n",
    */

export interface Task {
    type: TaskType
    parameters?: any;
}