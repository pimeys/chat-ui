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
const streamingCheckbox = document.getElementById("streaming-enabled");
const clientIdInput = document.getElementById("client-id");
const clientGroupInput = document.getElementById("client-group");

// State
let openai = null;
let selectedModel = null;
let isLoading = false;
let conversationHistory = [];
let streamingEnabled = true;
let selectedTools = [];

// Tool definitions
const toolPresets = {
  none: [],
  weather: [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get the current weather in a given location",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "The city and state, e.g. San Francisco, CA"
            },
            unit: {
              type: "string",
              enum: ["celsius", "fahrenheit"],
              description: "The unit of temperature"
            }
          },
          required: ["location"]
        }
      }
    }
  ],
  calculator: [
    {
      type: "function",
      function: {
        name: "calculate",
        description: "Perform mathematical calculations",
        parameters: {
          type: "object",
          properties: {
            expression: {
              type: "string",
              description: "The mathematical expression to evaluate"
            }
          },
          required: ["expression"]
        }
      }
    }
  ],
  search: [
    {
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web for information",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query"
            },
            max_results: {
              type: "integer",
              description: "Maximum number of results to return",
              default: 5
            }
          },
          required: ["query"]
        }
      }
    }
  ],
  multiple: [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get the current weather in a given location",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "The city and state, e.g. San Francisco, CA"
            },
            unit: {
              type: "string",
              enum: ["celsius", "fahrenheit"]
            }
          },
          required: ["location"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "calculate",
        description: "Perform mathematical calculations",
        parameters: {
          type: "object",
          properties: {
            expression: {
              type: "string",
              description: "The mathematical expression to evaluate"
            }
          },
          required: ["expression"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_time",
        description: "Get the current time in a specific timezone",
        parameters: {
          type: "object",
          properties: {
            timezone: {
              type: "string",
              description: "The timezone, e.g. America/New_York, Europe/London"
            }
          },
          required: ["timezone"]
        }
      }
    }
  ]
};

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  // Load saved values from localStorage
  const savedEndpoint = localStorage.getItem("nexusEndpoint");
  const savedClientId = localStorage.getItem("nexusClientId");
  const savedClientGroup = localStorage.getItem("nexusClientGroup");
  
  if (savedEndpoint) {
    endpointInput.value = savedEndpoint;
  }
  
  // Set client ID - use saved value or default
  if (clientIdInput) {
    if (savedClientId !== null) {
      clientIdInput.value = savedClientId;
    } else {
      // First time - use default and save it
      clientIdInput.value = "user-123";
      localStorage.setItem("nexusClientId", "user-123");
    }
  }
  
  // Set client group - use saved value or default
  if (clientGroupInput) {
    if (savedClientGroup !== null) {
      clientGroupInput.value = savedClientGroup;
    } else {
      // First time - use default and save it
      clientGroupInput.value = "free";
      localStorage.setItem("nexusClientGroup", "free");
    }
  }
  
  initializeOpenAI();
  loadModels();
  initializeToolsUI();

  // Event listeners
  sendBtn.addEventListener("click", sendMessage);
  userInput.addEventListener("keydown", handleKeyDown);
  endpointInput.addEventListener("change", () => {
    initializeOpenAI();
    loadModels();
  });
  
  // Add event listeners for header inputs
  if (clientIdInput) {
    clientIdInput.addEventListener("change", () => {
      initializeOpenAI();
    });
  }
  if (clientGroupInput) {
    clientGroupInput.addEventListener("change", () => {
      initializeOpenAI();
    });
  }
  
  modelSelect.addEventListener("change", (e) => {
    selectedModel = e.target.value;
    localStorage.setItem("selectedModel", selectedModel);
  });
  refreshModelsBtn.addEventListener("click", loadModels);
  newChatBtn.addEventListener("click", startNewChat);
  streamingCheckbox.addEventListener("change", (e) => {
    streamingEnabled = e.target.checked;
    localStorage.setItem("streamingEnabled", streamingEnabled);
  });

  // Auto-resize textarea
  userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = userInput.scrollHeight + "px";
  });

  // Load saved streaming preference
  const savedStreaming = localStorage.getItem("streamingEnabled");
  if (savedStreaming !== null) {
    streamingEnabled = savedStreaming === "true";
    streamingCheckbox.checked = streamingEnabled;
  }
});

function initializeToolsUI() {
  const toggleBtn = document.getElementById("toggle-tools");
  const toolsPanel = document.getElementById("tools-panel");
  const toolPresetSelect = document.getElementById("tool-preset");
  const customToolsContainer = document.getElementById("custom-tools-container");
  const customToolsTextarea = document.getElementById("custom-tools");
  const toolsPreview = document.getElementById("tools-preview");

  // Start with panel expanded
  toggleBtn.textContent = "▼";
  
  // Toggle panel visibility
  toggleBtn.addEventListener("click", () => {
    toolsPanel.classList.toggle("collapsed");
    toggleBtn.textContent = toolsPanel.classList.contains("collapsed") ? "▶" : "▼";
  });

  // Handle tool preset selection
  toolPresetSelect.addEventListener("change", (e) => {
    const preset = e.target.value;
    
    if (preset === "custom") {
      customToolsContainer.style.display = "block";
      // Try to parse custom tools
      try {
        const customTools = customToolsTextarea.value.trim();
        if (customTools) {
          selectedTools = JSON.parse(customTools);
        } else {
          selectedTools = [];
        }
      } catch (error) {
        console.error("Invalid JSON in custom tools:", error);
        selectedTools = [];
      }
    } else {
      customToolsContainer.style.display = "none";
      selectedTools = toolPresets[preset] || [];
    }
    
    updateToolsPreview();
  });

  // Handle custom tools input
  customToolsTextarea.addEventListener("input", () => {
    if (toolPresetSelect.value === "custom") {
      try {
        const customTools = customToolsTextarea.value.trim();
        if (customTools) {
          selectedTools = JSON.parse(customTools);
          updateToolsPreview();
          customToolsTextarea.style.borderColor = "";
        } else {
          selectedTools = [];
          updateToolsPreview();
        }
      } catch (error) {
        customToolsTextarea.style.borderColor = "#ff4444";
        toolsPreview.textContent = "Invalid JSON: " + error.message;
      }
    }
  });

  // Initialize with no tools
  selectedTools = [];
  updateToolsPreview();
}

function updateToolsPreview() {
  const toolsPreview = document.getElementById("tools-preview");
  if (selectedTools.length === 0) {
    toolsPreview.textContent = "No tools selected";
  } else {
    toolsPreview.textContent = JSON.stringify(selectedTools, null, 2);
  }
}

function initializeOpenAI() {
  const endpoint = endpointInput.value || "http://localhost:8080/llm";
  const clientId = clientIdInput ? clientIdInput.value : "";
  const clientGroup = clientGroupInput ? clientGroupInput.value : "";
  
  localStorage.setItem("nexusEndpoint", endpoint);
  localStorage.setItem("nexusClientId", clientId);
  localStorage.setItem("nexusClientGroup", clientGroup);

  // Build default headers
  const defaultHeaders = {};
  if (clientId) {
    defaultHeaders["x-client-id"] = clientId;
  }
  if (clientGroup) {
    defaultHeaders["x-client-group"] = clientGroup;
  }

  // Initialize OpenAI client with Nexus endpoint
  // Note: The API key is handled by Nexus server, not the browser
  openai = new OpenAI({
    apiKey: "not-used", // Nexus handles the real API key server-side
    baseURL: endpoint + "/v1",
    dangerouslyAllowBrowser: true, // Required for browser usage
    defaultHeaders: defaultHeaders,
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
  updateStatus("Thinking...");

  try {
    // Prepare request parameters
    const requestParams = {
      model: selectedModel,
      messages: conversationHistory,
      max_tokens: 2000
    };

    // Add tools if selected
    if (selectedTools.length > 0) {
      requestParams.tools = selectedTools;
      requestParams.tool_choice = "auto";
    }

    if (streamingEnabled) {
      // Streaming response
      requestParams.stream = true;
      const stream = await openai.chat.completions.create(requestParams);

      // Get the message element for streaming
      const messageEl = document.getElementById(typingId);
      if (!messageEl) {
        console.error("Message element not found for ID:", typingId);
        return;
      }

      const contentEl = messageEl.querySelector(".message-content");
      if (!contentEl) {
        console.error("Content element not found in message");
        return;
      }

      // Clear typing indicator
      contentEl.innerHTML = "";
      messageEl.classList.remove("typing");

      let fullResponse = "";
      let accumulatedContent = "";
      let toolCalls = [];
      let currentToolCall = null;

      // Process the stream
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          
          // Handle content
          const content = delta?.content || "";
          if (content) {
            accumulatedContent += content;
            fullResponse += content;

            // Update the UI with plain text during streaming to avoid markdown parsing issues
            // We'll render markdown after streaming is complete
            contentEl.textContent = accumulatedContent;

            // Auto-scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }

          // Handle tool calls
          if (delta?.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
              if (toolCallDelta.index !== undefined) {
                // Initialize or update tool call
                if (!toolCalls[toolCallDelta.index]) {
                  toolCalls[toolCallDelta.index] = {
                    id: toolCallDelta.id || "",
                    type: "function",
                    function: {
                      name: toolCallDelta.function?.name || "",
                      arguments: ""
                    }
                  };
                }
                
                const toolCall = toolCalls[toolCallDelta.index];
                
                if (toolCallDelta.id) {
                  toolCall.id = toolCallDelta.id;
                }
                
                if (toolCallDelta.function?.name) {
                  toolCall.function.name = toolCallDelta.function.name;
                }
                
                if (toolCallDelta.function?.arguments) {
                  toolCall.function.arguments += toolCallDelta.function.arguments;
                }
              }
            }
          }
        }
      } catch (streamError) {
        console.error("Error during streaming:", streamError);
        // Add error info to the message
        fullResponse += "\n\n[Stream interrupted: " + streamError.message + "]";
      }

      // After streaming is complete, render the full response with markdown
      console.log("Parsing markdown for streaming response:", fullResponse.substring(0, 100));
      let htmlContent = marked.parse(fullResponse || "*No text response*");
      console.log("HTML result:", htmlContent.substring(0, 200));
      
      // Add tool calls display if present
      if (toolCalls.length > 0) {
        htmlContent = renderToolCalls(toolCalls) + htmlContent;
      }
      
      contentEl.innerHTML = htmlContent;
      
      // Final scroll to bottom after markdown rendering
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Add to conversation history
      const assistantMessage = { role: "assistant", content: fullResponse };
      if (toolCalls.length > 0) {
        assistantMessage.tool_calls = toolCalls;
      }
      conversationHistory.push(assistantMessage);

    } else {
      // Non-streaming response
      requestParams.stream = false;
      requestParams.temperature = 0.7;
      requestParams.max_tokens = 1000;
      const response = await openai.chat.completions.create(requestParams);


      // Handle non-streaming response
      const messageEl = document.getElementById(typingId);
      if (!messageEl) {
        console.error("Message element not found for ID:", typingId);
        return;
      }

      const contentEl = messageEl.querySelector(".message-content");
      if (!contentEl) {
        console.error("Content element not found in message");
        return;
      }

      if (response.choices && response.choices.length > 0) {
        const choice = response.choices[0];
        const fullResponse = choice.message.content || "";
        const toolCalls = choice.message.tool_calls || [];

        // Clear any typing indicator and render markdown
        contentEl.innerHTML = "";

        // Parse markdown and set as HTML
        let htmlContent = marked.parse(fullResponse || "*No text response*");
        
        // Add tool calls display if present
        if (toolCalls.length > 0) {
          htmlContent = renderToolCalls(toolCalls) + htmlContent;
        }
        
        contentEl.innerHTML = htmlContent;

        // Remove typing class if it exists
        messageEl.classList.remove("typing");

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Add to conversation history
        const assistantMessage = { role: "assistant", content: fullResponse };
        if (toolCalls.length > 0) {
          assistantMessage.tool_calls = toolCalls;
        }
        conversationHistory.push(assistantMessage);
      } else {
        console.error("No choices in response:", response);
        // Remove the typing indicator message if no response
        messageEl.remove();
      }
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

function renderToolCalls(toolCalls) {
  if (!toolCalls || toolCalls.length === 0) return "";
  
  let html = '<div class="tool-calls-container">';
  
  for (const toolCall of toolCalls) {
    const toolName = toolCall.function?.name || "unknown";
    let args = "{}";
    
    try {
      if (toolCall.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        args = JSON.stringify(parsed, null, 2);
      }
    } catch (e) {
      args = toolCall.function?.arguments || "{}";
    }
    
    const toolCallId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    html += `
      <div class="tool-call" data-tool-call-id="${escapeHtml(toolCall.id)}">
        <div class="tool-call-header">🔧 Tool Call: ${escapeHtml(toolName)}</div>
        <div class="tool-call-details">
          <strong>ID:</strong> ${escapeHtml(toolCall.id || "N/A")}<br>
          <strong>Function:</strong> ${escapeHtml(toolName)}<br>
          <strong>Arguments:</strong>
          <div class="tool-call-json">
            <pre>${escapeHtml(args)}</pre>
          </div>
        </div>
        <button class="tool-response-btn" onclick="openToolResponseDialog('${escapeHtml(toolCall.id)}', '${escapeHtml(toolName)}')">Provide Tool Response</button>
        <button class="expand-json" onclick="copyToolCallJson('${toolCallId}')">Copy Full JSON</button>
        <textarea id="${toolCallId}" style="display:none;">${escapeHtml(JSON.stringify(toolCall, null, 2))}</textarea>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

// Add global function for copying tool call JSON
window.copyToolCallJson = function(toolCallId) {
  const textarea = document.getElementById(toolCallId);
  if (textarea) {
    navigator.clipboard.writeText(textarea.value).then(() => {
      const button = textarea.previousElementSibling;
      const originalText = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    });
  }
};

// Global state for pending tool calls
let pendingToolCalls = [];

// Open tool response dialog
window.openToolResponseDialog = function(toolCallId, toolName) {
  const dialog = document.createElement('div');
  dialog.className = 'tool-response-dialog';
  dialog.innerHTML = `
    <div class="dialog-backdrop" onclick="closeToolResponseDialog()"></div>
    <div class="dialog-content">
      <h3>Provide Tool Response</h3>
      <p><strong>Tool:</strong> ${toolName}</p>
      <p><strong>Tool Call ID:</strong> ${toolCallId}</p>
      <textarea id="tool-response-input" placeholder="Enter the tool response JSON..." rows="10"></textarea>
      <div class="dialog-buttons">
        <button onclick="submitToolResponse('${toolCallId}')">Submit Response</button>
        <button onclick="closeToolResponseDialog()">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);
  document.getElementById('tool-response-input').focus();
};

// Close tool response dialog
window.closeToolResponseDialog = function() {
  const dialog = document.querySelector('.tool-response-dialog');
  if (dialog) {
    dialog.remove();
  }
};

// Submit tool response and continue conversation
window.submitToolResponse = async function(toolCallId) {
  const responseInput = document.getElementById('tool-response-input');
  const responseContent = responseInput.value.trim();
  
  if (!responseContent) {
    alert('Please enter a tool response');
    return;
  }
  
  // Add tool response to conversation history
  conversationHistory.push({
    role: "tool",
    tool_call_id: toolCallId,
    content: responseContent
  });
  
  // Close dialog
  closeToolResponseDialog();
  
  // Mark this tool call as responded
  const toolCallDiv = document.querySelector(`[data-tool-call-id="${toolCallId}"]`);
  if (toolCallDiv) {
    const responseBtn = toolCallDiv.querySelector('.tool-response-btn');
    if (responseBtn) {
      responseBtn.textContent = '✓ Response Provided';
      responseBtn.disabled = true;
    }
  }
  
  // Check if all tool calls have responses
  const allToolCalls = document.querySelectorAll('.tool-call[data-tool-call-id]');
  const unresolvedCalls = Array.from(allToolCalls).filter(div => {
    const btn = div.querySelector('.tool-response-btn');
    return btn && !btn.disabled;
  });
  
  if (unresolvedCalls.length === 0) {
    // All tool calls have responses, automatically continue the conversation
    await continueAfterToolResponses();
  }
};

// Continue conversation after all tool responses are provided
async function continueAfterToolResponses() {
  if (isLoading) return;
  
  isLoading = true;
  sendBtn.disabled = true;
  userInput.disabled = true;
  
  // Show typing indicator
  const typingId = addMessage("assistant", "", true);
  updateStatus("Processing tool responses...");
  
  try {
    // Prepare request with updated conversation history including tool responses
    const requestParams = {
      model: selectedModel,
      messages: conversationHistory,
      max_tokens: 2000
    };
    
    // Add tools if selected
    if (selectedTools.length > 0) {
      requestParams.tools = selectedTools;
      requestParams.tool_choice = "auto";
    }
    
    if (streamingEnabled) {
      requestParams.stream = true;
      const stream = await openai.chat.completions.create(requestParams);
      
      // Process streaming response (same as in sendMessage)
      const messageEl = document.getElementById(typingId);
      if (!messageEl) return;
      
      const contentEl = messageEl.querySelector(".message-content");
      if (!contentEl) return;
      
      contentEl.innerHTML = "";
      messageEl.classList.remove("typing");
      
      let fullResponse = "";
      let accumulatedContent = "";
      let toolCalls = [];
      
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const content = delta?.content || "";
        
        if (content) {
          accumulatedContent += content;
          fullResponse += content;
          contentEl.textContent = accumulatedContent;
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            if (toolCallDelta.index !== undefined) {
              if (!toolCalls[toolCallDelta.index]) {
                toolCalls[toolCallDelta.index] = {
                  id: toolCallDelta.id || "",
                  type: "function",
                  function: {
                    name: toolCallDelta.function?.name || "",
                    arguments: ""
                  }
                };
              }
              
              const toolCall = toolCalls[toolCallDelta.index];
              
              if (toolCallDelta.id) toolCall.id = toolCallDelta.id;
              if (toolCallDelta.function?.name) toolCall.function.name = toolCallDelta.function.name;
              if (toolCallDelta.function?.arguments) toolCall.function.arguments += toolCallDelta.function.arguments;
            }
          }
        }
      }
      
      let htmlContent = marked.parse(fullResponse || "*No text response*");
      if (toolCalls.length > 0) {
        htmlContent = renderToolCalls(toolCalls) + htmlContent;
      }
      contentEl.innerHTML = htmlContent;
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      const assistantMessage = { role: "assistant", content: fullResponse };
      if (toolCalls.length > 0) {
        assistantMessage.tool_calls = toolCalls;
      }
      conversationHistory.push(assistantMessage);
      
    } else {
      // Non-streaming response
      requestParams.stream = false;
      const response = await openai.chat.completions.create(requestParams);
      
      const messageEl = document.getElementById(typingId);
      if (!messageEl) return;
      
      const contentEl = messageEl.querySelector(".message-content");
      if (!contentEl) return;
      
      if (response.choices && response.choices.length > 0) {
        const choice = response.choices[0];
        const fullResponse = choice.message.content || "";
        const toolCalls = choice.message.tool_calls || [];
        
        contentEl.innerHTML = "";
        let htmlContent = marked.parse(fullResponse || "*No text response*");
        
        if (toolCalls.length > 0) {
          htmlContent = renderToolCalls(toolCalls) + htmlContent;
        }
        
        contentEl.innerHTML = htmlContent;
        messageEl.classList.remove("typing");
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        const assistantMessage = { role: "assistant", content: fullResponse };
        if (toolCalls.length > 0) {
          assistantMessage.tool_calls = toolCalls;
        }
        conversationHistory.push(assistantMessage);
      }
    }
    
    updateStatus("Ready");
  } catch (error) {
    console.error("Error:", error);
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    addMessage("error", `Error: ${error.message}`);
    updateStatus("Error occurred");
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
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
}
