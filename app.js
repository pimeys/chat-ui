import OpenAI from "openai";

// DOM elements
const messagesContainer = document.getElementById("messages");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const statusEl = document.getElementById("status");
const endpointInput = document.getElementById("endpoint");
const modelSelect = document.getElementById("model");
const refreshModelsBtn = document.getElementById("refresh-models");
const newChatBtn = document.getElementById("new-chat");

// State
let openai = null;
let selectedModel = null;
let isLoading = false;
let conversationHistory = [];

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  initializeOpenAI();
  loadModels();

  // Event listeners
  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keydown", handleKeyDown);
  endpointInput.addEventListener("change", () => {
    initializeOpenAI();
    loadModels();
  });
  modelSelect.addEventListener("change", (e) => {
    selectedModel = e.target.value;
    localStorage.setItem("selectedModel", selectedModel);
  });
  refreshModelsBtn.addEventListener("click", loadModels);
  newChatBtn.addEventListener("click", startNewChat);

  // Auto-resize textarea
  userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = userInput.scrollHeight + "px";
  });

  // Load saved endpoint
  const savedEndpoint = localStorage.getItem("nexusEndpoint");
  if (savedEndpoint) {
    endpointInput.value = savedEndpoint;
  }
});

function initializeOpenAI() {
  const endpoint = endpointInput.value || "http://localhost:8000/llm";
  localStorage.setItem("nexusEndpoint", endpoint);

  // Initialize OpenAI client with Nexus endpoint
  // Note: The API key is handled by Nexus server, not the browser
  openai = new OpenAI({
    apiKey: "not-used", // Nexus handles the real API key server-side
    baseURL: endpoint + "/v1",
    dangerouslyAllowBrowser: true, // Required for browser usage
  });

  updateStatus("Connected to " + endpoint);
}

async function loadModels() {
  try {
    updateStatus("Loading models...");
    refreshModelsBtn.disabled = true;
    refreshModelsBtn.innerHTML = '<span class="loading"></span>';

    const response = await openai.models.list();
    const models = response.data || [];

    modelSelect.innerHTML = "";

    if (models.length === 0) {
      modelSelect.innerHTML = '<option value="">No models available</option>';
      sendBtn.disabled = true;
    } else {
      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.id;
        modelSelect.appendChild(option);
      });

      // Restore selected model or use first
      const savedModel = localStorage.getItem("selectedModel");
      if (savedModel && models.find((m) => m.id === savedModel)) {
        modelSelect.value = savedModel;
        selectedModel = savedModel;
      } else {
        selectedModel = models[0].id;
        modelSelect.value = selectedModel;
      }

      sendBtn.disabled = false;
      updateStatus("Ready");
    }
  } catch (error) {
    console.error("Failed to load models:", error);
    updateStatus("Failed to load models: " + error.message);
    modelSelect.innerHTML = '<option value="">Error loading models</option>';
    sendBtn.disabled = true;
  } finally {
    refreshModelsBtn.disabled = false;
    refreshModelsBtn.innerHTML = "↻";
  }
}

function handleKeyDown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

async function sendMessage() {
  const message = userInput.value.trim();
  if (!message || isLoading || !selectedModel) return;

  isLoading = true;
  sendBtn.disabled = true;
  userInput.disabled = true;

  // Add user message to UI
  addMessage("user", message);
  conversationHistory.push({ role: "user", content: message });

  // Clear input
  userInput.value = "";
  userInput.style.height = "auto";

  // Show typing indicator
  const typingId = addMessage("assistant", "", true);
  console.log("Created typing indicator with ID:", typingId);
  updateStatus("Thinking...");

  try {
    // Make API call using OpenAI SDK (non-streaming for now)
    const response = await openai.chat.completions.create({
      model: selectedModel,
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: 1000,
      stream: false, // Nexus doesn't support streaming yet
    });

    console.log("Response received:", response);

    // Handle non-streaming response
    console.log("Looking for typing indicator with ID:", typingId);
    const messageEl = document.getElementById(typingId);
    if (!messageEl) {
      console.error("Message element not found for ID:", typingId);
      console.log(
        "All message IDs present:",
        Array.from(document.querySelectorAll(".message")).map((m) => m.id),
      );
      return;
    }

    const contentEl = messageEl.querySelector(".message-content");
    if (!contentEl) {
      console.error("Content element not found in message");
      return;
    }

    if (response.choices && response.choices.length > 0) {
      const fullResponse = response.choices[0].message.content;
      console.log("Setting response text:", fullResponse);

      // Clear any typing indicator and render markdown
      contentEl.innerHTML = "";

      // Parse markdown and set as HTML
      const htmlContent = marked.parse(fullResponse);
      contentEl.innerHTML = htmlContent;

      // Remove typing class if it exists
      messageEl.classList.remove("typing");

      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Add to conversation history
      conversationHistory.push({ role: "assistant", content: fullResponse });
    } else {
      console.error("No choices in response:", response);
      // Remove the typing indicator message if no response
      messageEl.remove();
    }

    updateStatus("Ready");
  } catch (error) {
    console.error("Error:", error);

    // Remove typing indicator
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    // Show error message
    addMessage("error", `Error: ${error.message}`);
    updateStatus("Error occurred");
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
}

let messageCounter = 0;

function addMessage(role, content, isTyping = false) {
  const messageId = "msg-" + Date.now() + "-" + ++messageCounter;
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;
  messageDiv.id = messageId;

  const roleLabel =
    role === "user" ? "You" : role === "error" ? "Error" : "Assistant";

  messageDiv.innerHTML = `
        <div class="message-role">${roleLabel}</div>
        <div class="message-content">${isTyping ? '<span class="typing-indicator"></span>' : escapeHtml(content)}</div>
    `;

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  console.log("Added message with ID:", messageId, "isTyping:", isTyping);
  return messageId;
}

function updateStatus(status) {
  statusEl.textContent = status;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function startNewChat() {
  // Clear conversation history
  conversationHistory = [];

  // Clear messages container and add welcome message
  messagesContainer.innerHTML = `
        <div class="message assistant">
            <div class="message-role">Assistant</div>
            <div class="message-content">Hello! I'm connected to Nexus LLM. How can I help you today?</div>
        </div>
    `;

  // Reset message counter
  messageCounter = 0;

  // Clear input and reset height
  userInput.value = "";
  userInput.style.height = "auto";
  userInput.focus();

  // Update status
  updateStatus("Ready");

  console.log("Started new chat session");
}
