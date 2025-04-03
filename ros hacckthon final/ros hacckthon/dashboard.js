// Initialize CodeMirror with better defaults
let editor = CodeMirror(document.getElementById("codeEditor"), {
    mode: "javascript",
    theme: "monokai",
    lineNumbers: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 4,
    tabSize: 4,
    lineWrapping: true,
    extraKeys: {
        "Ctrl-Space": "autocomplete",
        "Tab": function(cm) {
            if (cm.somethingSelected()) {
                cm.indentSelection("add");
            } else {
                cm.replaceSelection("    ", "end");
            }
        }
    },
    indentWithTabs: false,
    autofocus: true,
    styleActiveLine: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    highlightSelectionMatches: {showToken: /\w/, annotateScrollbar: true}
});

// Set default code based on selected language
function setDefaultCode(language) {
    let defaultCode = "";
    switch(language) {
        case "python":
            defaultCode = `# Welcome to CodeHUB Terminal
# Write your Python code here

def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()`;
            break;
        case "javascript":
            defaultCode = `// Welcome to CodeHUB Terminal
// Write your JavaScript code here

function main() {
    console.log("Hello, World!");
}

main();`;
            break;
        case "java":
            defaultCode = `// Welcome to CodeHUB Terminal
// Write your Java code here

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`;
            break;
        case "cpp":
            defaultCode = `// Welcome to CodeHUB Terminal
// Write your C++ code here

#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`;
            break;
        default:
            defaultCode = `// Welcome to CodeHUB Terminal
// Write your code here

console.log("Hello, World!");`;
    }
    editor.setValue(defaultCode);
}

// Set initial default code
setDefaultCode("javascript");

// WebSocket connection
let ws = null;
let isExecuting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Initialize WebSocket connection
function initWebSocket() {
    if (ws) {
        ws.close();
    }

    // Use localhost instead of hostname
    const wsUrl = 'ws://localhost:8000/ws/code-execution';
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('Connected to code execution server');
        document.querySelector('.language-selector button').disabled = false;
        reconnectAttempts = 0;
        updateConnectionStatus(true);
        showError('Connected to code execution server successfully!');
    };
    
    ws.onclose = () => {
        console.log('Disconnected from code execution server');
        document.querySelector('.language-selector button').disabled = true;
        updateConnectionStatus(false);
        
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const retryTime = 5000 * reconnectAttempts;
            showError(`Connection lost. Retrying in ${retryTime/1000} seconds... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            setTimeout(initWebSocket, retryTime);
        } else {
            showError('Failed to connect to server after multiple attempts. Please check if the backend server is running on port 8000 and refresh the page.');
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        showError('Connection error occurred. Make sure the backend server is running on port 8000.');
    };
    
    ws.onmessage = (event) => {
        const response = JSON.parse(event.data);
        const output = document.getElementById("output");
        
        if (response.type === "output") {
            output.innerHTML += `<div class="output-line">${response.data}</div>`;
            output.scrollTop = output.scrollHeight;
        } else if (response.type === "error") {
            output.innerHTML += `<div class="error-line">${response.message}</div>`;
            output.scrollTop = output.scrollHeight;
            isExecuting = false;
            updateRunButton();
        } else if (response.type === "completion") {
            output.innerHTML += `<div class="completion-line">Program exited with code ${response.exit_code}</div>`;
            output.scrollTop = output.scrollHeight;
            isExecuting = false;
            updateRunButton();
        }
    };
}

// Update connection status in UI
function updateConnectionStatus(connected) {
    const statusElement = document.createElement('div');
    statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    statusElement.innerHTML = connected ? 
        '<i class="bi bi-check-circle"></i> Connected' : 
        '<i class="bi bi-x-circle"></i> Disconnected';
    
    const existingStatus = document.querySelector('.connection-status');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    document.querySelector('.section-header').appendChild(statusElement);
}

// Show error message
function showError(message) {
    const output = document.getElementById("output");
    output.innerHTML += `<div class="error-line">${message}</div>`;
    output.scrollTop = output.scrollHeight;
}

// Initialize WebSocket connection when page loads
initWebSocket();

// Theme selection handler
document.getElementById("themeSelect").addEventListener("change", function(e) {
    const theme = e.target.value;
    editor.setOption("theme", theme);
});

// Language selection handler with improved mode setting
document.getElementById("languageSelect").addEventListener("change", function(e) {
    const language = e.target.value;
    let mode;
    
    switch (language) {
        case "python":
            mode = "python";
            break;
        case "javascript":
            mode = "javascript";
            break;
        case "java":
            mode = "text/x-java";
            break;
        case "cpp":
            mode = "text/x-c++src";
            break;
        default:
            mode = "javascript";
    }
    
    editor.setOption("mode", mode);
    setDefaultCode(language);
});

// Update run button state
function updateRunButton() {
    const runBtn = document.querySelector('.language-selector button');
    runBtn.innerHTML = isExecuting ? '<i class="bi bi-hourglass-split"></i> Running...' : '<i class="bi bi-play-fill"></i> Run';
    runBtn.disabled = isExecuting;
}

// Run code function
function runCode() {
    if (isExecuting) return;
    
    const code = editor.getValue();
    const language = document.getElementById("languageSelect").value;
    const output = document.getElementById("output");
    
    // Clear previous output
    output.innerHTML = '';
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        output.innerHTML = '<div class="error-line">Not connected to execution server. Retrying...</div>';
        initWebSocket();
        return;
    }
    
    isExecuting = true;
    updateRunButton();
    
    // Send code execution request
    ws.send(JSON.stringify({
        language: language,
        code: code
    }));
}

// Clear output function
function clearOutput() {
    document.getElementById("output").innerHTML = '';
}

// Navigation between sections
document.querySelectorAll('.nav-links li').forEach(item => {
    item.addEventListener('click', function() {
        const sectionId = this.getAttribute('data-section');
        
        // Update active state in navigation
        document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
        this.classList.add('active');
        
        // Show selected section
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.getElementById(sectionId).classList.add('active');
    });
});

// Add some CSS styles for the output and connection status
const style = document.createElement('style');
style.textContent = `
    .output-line {
        color: #fff;
        font-family: 'Consolas', 'Monaco', monospace;
        padding: 2px 0;
    }
    
    .error-line {
        color: #ff6b6b;
        font-family: 'Consolas', 'Monaco', monospace;
        padding: 2px 0;
    }
    
    .completion-line {
        color: #51cf66;
        font-family: 'Consolas', 'Monaco', monospace;
        padding: 2px 0;
        border-top: 1px solid #444;
        margin-top: 5px;
    }

    .connection-status {
        display: flex;
        align-items: center;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 14px;
        margin-left: 10px;
    }

    .connection-status.connected {
        background-color: rgba(81, 207, 102, 0.1);
        color: #51cf66;
    }

    .connection-status.disconnected {
        background-color: rgba(255, 107, 107, 0.1);
        color: #ff6b6b;
    }

    .connection-status i {
        margin-right: 5px;
    }
`;
document.head.appendChild(style);

// Send message in CodeBuddy
function sendMessage() {
    const userInput = document.getElementById("userInput");
    const message = userInput.value.trim();
    
    if (message) {
        // Add user message to chat
        addMessage(message, 'user');
        
        // Clear input
        userInput.value = '';
        
        // Simulate bot response (replace with actual API call)
        setTimeout(() => {
            const botResponse = "I'm CodeBuddy, your AI coding assistant. I can help you with coding questions, debugging, and more. What would you like to know?";
            addMessage(botResponse, 'bot');
        }, 1000);
    }
}

// Add message to chat
function addMessage(text, sender) {
    const chatMessages = document.getElementById("chatMessages");
    
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;
    
    const avatarDiv = document.createElement("div");
    avatarDiv.className = "message-avatar";
    
    const icon = document.createElement("i");
    icon.className = sender === 'user' ? 'bi bi-person' : 'bi bi-robot';
    avatarDiv.appendChild(icon);
    
    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    contentDiv.appendChild(paragraph);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle sign-out
function signOut() {
    // Clear user data from localStorage
    localStorage.removeItem('userData');
    
    // Redirect to login page
    window.location.href = 'index.html';
}

// Load user data
function loadUserData() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    if (userData.name) {
        document.getElementById('userName').textContent = userData.name;
    }
    
    if (userData.imageUrl) {
        document.getElementById('userAvatar').src = userData.imageUrl;
    }
}

// Initialize CodeMirror for snippet code
let snippetEditor;

// Initialize snippet editor when modal is shown
document.getElementById('addSnippetModal').addEventListener('show.bs.modal', function () {
    if (!snippetEditor) {
        snippetEditor = CodeMirror.fromTextArea(document.getElementById("snippetCode"), {
            mode: "javascript",
            theme: "default",
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4,
            tabSize: 4,
            lineWrapping: true
        });
    }
});

// Update snippet editor mode when language changes
document.getElementById('snippetLanguage').addEventListener('change', function(e) {
    const language = e.target.value.toLowerCase();
    snippetEditor.setOption("mode", language === 'c++' ? 'text/x-c++src' : language);
});

// Handle add snippet button click
document.querySelector('.add-snippet-btn').addEventListener('click', function() {
    const modal = new bootstrap.Modal(document.getElementById('addSnippetModal'));
    modal.show();
});

// Save snippet function
function saveSnippet() {
    const title = document.getElementById('snippetTitle').value;
    const language = document.getElementById('snippetLanguage').value;
    const code = snippetEditor.getValue();
    const description = document.getElementById('snippetDescription').value;
    
    if (!title || !code) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Create new snippet card
    const snippetCard = createSnippetCard({
        title: title,
        language: language,
        code: code,
        description: description,
        user: {
            name: document.getElementById('userName').textContent,
            avatar: document.getElementById('userAvatar').src
        }
    });
    
    // Add to code snippets container
    document.querySelector('.code-snippets').insertBefore(snippetCard, document.querySelector('.code-snippets').firstChild);
    
    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('addSnippetModal'));
    modal.hide();
    document.getElementById('snippetForm').reset();
    snippetEditor.setValue('');
}

// Create snippet card function
function createSnippetCard(snippet) {
    const card = document.createElement('div');
    card.className = 'snippet-card';
    
    card.innerHTML = `
        <div class="snippet-header">
            <h3>${snippet.title}</h3>
            <span class="language-tag">${snippet.language}</span>
        </div>
        <pre class="snippet-preview">${snippet.code}</pre>
        ${snippet.description ? `<p class="snippet-description">${snippet.description}</p>` : ''}
        <div class="snippet-footer">
            <div class="user-info">
                <img src="${snippet.user.avatar}" alt="User" class="rounded-circle">
                <span>${snippet.user.name}</span>
            </div>
            <div class="snippet-actions">
                <button class="btn btn-sm btn-outline-light"><i class="bi bi-star"></i> 0</button>
                <button class="btn btn-sm btn-outline-light"><i class="bi bi-share"></i></button>
            </div>
        </div>
    `;
    
    return card;
}

// Initialize when the page loads
window.onload = function() {
    loadUserData();
    
    // Check if user is logged in
    if (!localStorage.getItem('userData')) {
        window.location.href = 'index.html';
    }
};

// Add this at the end of your file
editor.on("keyup", function (cm, event) {
    if (!cm.state.completionActive && 
        event.keyCode != 13 && 
        event.keyCode != 27 && 
        event.keyCode != 37 && 
        event.keyCode != 38 && 
        event.keyCode != 39 && 
        event.keyCode != 40) {
        CodeMirror.commands.autocomplete(cm, null, {completeSingle: false});
    }
}); 