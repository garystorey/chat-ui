import type { ChatSummary } from "../types";

export const suggestions = [
  {
    id: -1,
    title: "Godot",
    description:
      "Create a 2d platformer game using the Godot engine with basic player movement and enemy AI.",
    prompt:
      "Create a 2d platformer game using the Godot engine with basic player movement and enemy AI. Use a single scene with a player character that can move left, right, and jump. Add simple enemy characters that patrol a set area and cause the player to lose health on contact.",
    actionLabel: "Start",
    icon: "👨‍💻",
  },
  {
    id: -2,
    title: "ComfyUI",
    description:
      "Create a ComfyUI workflow that generates images based on text prompts using stable diffusion models.",
    prompt:
      "Create a ComfyUI workflow that generates images based on text prompts using stable diffusion models. The workflow should include nodes for text input, image generation, and output display. Configure the nodes to use appropriate models and settings for high-quality image generation.",
    actionLabel: "Start",
    icon: "🤖",
  },
  {
    id: -3,
    title: "React",
    description:
      "Create a React application that fetches data from an API and displays it in a user-friendly interface.",
    prompt:
      "Create a React application that fetches data from an API and displays it in a user-friendly interface. The application should include components for displaying lists and details, handle loading and error states, and be styled using CSS.",
    actionLabel: "Start",
    icon: "⚛️",
  },
];

export const defaultChats: ChatSummary[] = [
  {
    id: "12321",
    title: "ClientX Team pairing ideas",
    preview:
      "Based on the requirements for ClientX, give me three pairing ideas that balance mobile, API, and QA expertise for the payments team.",
    updatedAt: Date.now() - 1000 * 60 * 15,
    messages: [
      {
        id: "4233423",
        sender: "user",
        content:
          "Can you suggest a few pairings of engineers for ClientX who have complementary skills for the payments team?",
      },
      {
        id: "4345",
        sender: "bot",
        content:
          "Here are three pairing ideas that balance mobile, API, and QA expertise for the payments pod.",
      },
    ],
  },
  {
    id: "23439",
    title: "ATL Staffing follow-up",
    preview:
      "We still have four roles open in Atlanta for Cox: two frontend, one backend, and a data analyst position.",
    updatedAt: Date.now() - 1000 * 60 * 60,
    messages: [
      {
        id: "98767",
        sender: "user",
        content:
          "Can you recap the open roles we still need to fill in Atlanta for Cox?",
      },
      {
        id: "67534",
        sender: "bot",
        content:
          "We still have four roles open at Cox in Atlanta: two frontend, one backend, and a data analyst position. Would you like me to suggest candidates for any of these roles?",
      },
    ],
  },
  {
    id: "86634343",
    title: "Nimbus SOW notes",
    preview: "Next position for Nimbus onboarding",
    updatedAt: Date.now() - 1000 * 60 * 90,
    messages: [
      {
        id: "55333378",
        sender: "user",
        content:
          "Return the next position from the Nimbus statement of work and the top five candidates for that position.",
      },
      {
        id: "676656777",
        sender: "bot",
        content:
          "The next position for Nimbus onboarding is **Senior Frontend Engineer**. The requirements are: - React, - TypeScript, - AWS experience. Here are the top five candidates for this role...",
      },
    ],
  },
];
