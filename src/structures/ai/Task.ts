export enum TaskType {
    Unknown = "unknown",
    SearchWeb = "search_internet",
    SearchResults = "search_results",
    WebsiteResponse = "website_response",
    UploadImage = "upload_image"
}

export interface Task {
    type: TaskType
    parameters: any;
}