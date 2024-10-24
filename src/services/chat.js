const config = require("../config/config");
const UserModel = require("../models/user");

class ChatService {
  #utilService = {};
  #googleService = {};

  constructor(utilService, googleService) {
    this.#utilService = utilService;
    this.#googleService = googleService;
  }

  async chat(userId, message, currentTime) {
    try {
      if (!userId || !message || !currentTime) {
        throw new Error("Missing requried fields");
      }

      const user = await UserModel.findOne({ userId });

      if (!user) {
        throw new Error("No user found");
      }

      const refreshRequired = this.#utilService.isRefreshRequired(user.expiresIn);

      if (refreshRequired) {
        const refreshAccessTokenResponse = await this.#googleService.refreshAccessToken(user.refreshToken);
        if (!refreshAccessTokenResponse?.success) {
          throw new error(refreshAccessTokenResponse.message);
        }

        user.accessToken = refreshAccessTokenResponse.data.accessToken;
        user.expiresIn = refreshAccessTokenResponse.data.expiresIn;
        await user.save();
      }

      const date = new Date(currentTime * 1000);

      let systemPrompt = `You are a Calendar Assistant AI Agent, expert in handling meeitng and schedules for the user.
      Today's date: ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, 0)}-${date.getDate()}.
      User's name: ${user?.name}`;

      const tools = [
        {
          type: "function",
          function: {
            name: "get_events",
            description: "Get events within a time period",
            parameters: {
              type: "object",
              properties: {
                fromDate: {
                  type: "string",
                  description: "Starting date to search events in ISO format. Eg: 2024-10-24T10:55:24.037Z",
                },
                toDate: {
                  type: "string",
                  description: "Ending date to search events in ISO format. Eg: 2024-11-24T10:55:24.037Z",
                }
              },
              required: ["fromDate", "toDate"],
            }
          }
        }
      ];

      const messages = [
        {
          role: "system",
          content: systemPrompt,
        },
        ...user.messages,
        {
          role: "user",
          content: message,
        },
      ]

      let makeRequestResponse = await this.makeRequest(messages, tools);

      if (!makeRequestResponse?.choices[0]?.message) {
        throw new Error("Unable to get response");
      }

      if (makeRequestResponse.choices[0].message?.content) {
        return {
          success: true,
          message: makeRequestResponse.choices[0].message.content,
        }
      }

      let eventsString = "";

      if (makeRequestResponse.choices[0].message?.tool_calls[0]?.function?.name === "get_events") {
        const args = JSON.parse(makeRequestResponse.choices[0].message.tool_calls[0].function.arguments);
        args.fromDate = new Date(args.fromDate);
        args.toDate = new Date(args.toDate);

        // args.toDate.setDate(args.toDate.getDate() + 1); // increasing one day.

        const getEventsResponse = await this.#googleService.getEvents(user.accessToken, args.fromDate.toISOString(), args.toDate.toISOString());

        if (!getEventsResponse?.success) {
          throw new Error("Unable to get events");
        }

        const formatedEvents = getEventsResponse.data.events.map(event => ({
          Name: event.summary,
          "Start Time": event.start.dateTime,
          "End Time": event.end.dateTime,
          Organizer: event.organizer.email,
        }));

        for (let event of formatedEvents) {
          for (let key in event) {
            eventsString += `${key}: ${event[key]}\n`;
          }
          eventsString += "\n";
        }
      }

      console.log(eventsString);

      messages[0].content = systemPrompt += `\nAvailable Events:\n ${eventsString}`;

      makeRequestResponse = await this.makeRequest(messages);

      if (!makeRequestResponse.choices[0].message?.content) {
        throw new Error("Unable to get response");
      }

      return {
        success: true,
        message: makeRequestResponse.choices[0].message.content,
      }
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: "Unable to chat right now",
      }
    }
  }

  async makeRequest(messages, tools) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.OPEN_AI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,// []{ role, conten }
        ...(tools && {
          tools,
          tool_choice: "auto",
        }),
      }),
    });

    return await response.json();
  }
}

module.exports = ChatService;
