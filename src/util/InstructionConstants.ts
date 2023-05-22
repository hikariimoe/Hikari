export const InstructionData = {
    "search_internet": {
        parameters: {
            query: "your search query"
        }
    },

    "discord_action": {
        parameters: {
            action: "the action you want to run on discord",
            value: "the value you want to use/execute"
        }
    }
}

/*
    "1. \"search_internet\" - { \"type\": \"search_internet\", \"parameters\": { \"query\": \"your search query\" } }\n",
    "2. \"search_images\" - { \"type\": \"search_images\", \"parameters\": { \"type\": \"the website you want to search; only gelbooru and google are supported. for anime images, always use gelbooru and its tagging system.\" \"query\": \"your search query/gelbooru tags\", \"limit\": a number of how many images you want to find (has to be a number between 1 and 10) } }\n",
    "3. \"search_wolfram_alpha\" - { \"type\": \"search_wolfram_alpha\", \"parameters\": { \"query\": \"your wolfram alpha query\" } }\n",
    "4. \"view_website\" - { \"type\": \"view_website\", \"parameters\": { \"query\": \"your query\", \"website\": \"website to visit\" } }\n",
    "7. \"upload_image\" - { \"type\": \"upload_image\", \"parameters\": { \"urls\": [ the urls of the images you want to upload ] } }\n",
    "8. \"discord_action\" - { \"type\": \"discord action\", \"parameters\" { \"action\": \"the action you want to run on discord\" \"value\": \"the value you want to use/execute\" } }",
     # "9. \"search_memory\" - { \"type\": \"search_memory\", \"parameters\" { \"user\": \"the user you want to search memories for\" } }",
    # The above doesn't work due the the AI's negligence during testing in GPT-3.5-turbo. Maybe it works better in GPT-4 but we won't be testing that for now
    */

export const DiscordInstructionData = {
    "delete_message": "deletes a message, requires the id of the message you want to delete",
}

/*
    "\"delete_message\" - deletes a message, requires the id of the message you want to delete",
    "\"change_status\" - changes the playing status you're showing on discord, and requires the status you want to change to as the value",
    */

export const InstructionResponseData = {
    "upload_image": {
        parameters: {
            query: "a text describing the image(s) that were just uploaded"
        }
    }
}

/*
"1. \"upload_image\" - { \"type\": \"upload_image\", \"parameters\": { \"query\": \"a text describing the image(s) that were just uploaded\" } }\n",
    "2. \"action_response\" - { \"type\": \"action_response\", \"parameters\": { \"action\": \"the action this is in response to\", \"response\": \"the text response to that action, you're expected to respond in coordination with it\" } }\n",
    */