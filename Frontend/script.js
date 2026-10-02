
const API = "/api";

const GOOGLE_CLIENT_ID = "712259676695-036vmfom16n64i6uo6lrvnukdlq3ed5b.apps.googleusercontent.com";

let currentUser = null;
let currentToken = null;

let allPosts = [];
let allUsers = [];

let socket = null;
let followingUsers = [];
let inboxUsers = [];
let searchUsersResults = [];
let activeChatUser = null;
let chatMessages = [];
let searchTimer = null;
let currentCommentPostId = null;
let replyingToComment = null;
let currentPostComments = [];

let currentView = "feed";

function $(id) {
  return document.getElementById(id);
}

function showToast(message, type = "info") {

  const container = $("toast-container");

  if (!container) {
    alert(message);
    return;
  }

  const toast = document.createElement("div");

  toast.className = `toast toast-${type}`;

  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {

    toast.classList.remove("show");

    setTimeout(() => {
      toast.remove();
    }, 300);

  }, 3000);
}


function escapeHTML(value = "") {

  const div = document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}

function formatDate(dateValue) {

  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}


function avatarHTML(user, className = "avatar avatar-md") {

  const name =
    user?.name ||
    user?.username ||
    "U";

  const profile =
    user?.profile ||
    "";

  if (profile) {

    return `
            <img
                class="${className}"
                src="${escapeHTML(profile)}"
                alt="${escapeHTML(name)}"
                onerror="
                    this.onerror=null;
                    this.src='';
                    this.classList.add('avatar-fallback');
                "
            >
        `;
  }

  const letter =
    name.charAt(0).toUpperCase();

  return `
        <div
            class="${className} avatar-letter"
            aria-label="${escapeHTML(name)}"
        >
            ${escapeHTML(letter)}
        </div>
    `;
}

function saveAuth(token, user) {

  currentToken = token;

  currentUser = user;

  localStorage.setItem(
    "nexus_token",
    token
  );

  localStorage.setItem(
    "nexus_user",
    JSON.stringify(user)
  );
}


function loadAuth() {

  const token =
    localStorage.getItem("nexus_token");

  const user =
    localStorage.getItem("nexus_user");

  if (!token || !user) {
    return false;
  }

  try {

    currentToken = token;

    currentUser = JSON.parse(user);

    return true;

  } catch (error) {

    console.error(
      "Failed to load saved user:",
      error
    );

    clearAuth();

    return false;
  }
}


function clearAuth() {

  currentToken = null;

  currentUser = null;

  localStorage.removeItem(
    "nexus_token"
  );

  localStorage.removeItem(
    "nexus_user"
  );
}


/* =========================================================
   API HEADERS
   ========================================================= */

function authHeaders(includeJSON = true) {

  const headers = {};

  if (includeJSON) {

    headers["Content-Type"] =
      "application/json";
  }

  if (currentToken) {

    headers["Authorization"] =
      `Bearer ${currentToken}`;
  }

  return headers;
}


/* =========================================================
   GENERIC API REQUEST
   ========================================================= */

async function apiRequest(url, options = {}) {

  const headers = {
    ...authHeaders(
      options.body !== undefined
    ),
    ...(options.headers || {})
  };

  const response =
    await fetch(url, {
      ...options,
      headers
    });

  let data = {};

  try {

    data =
      await response.json();

  } catch {

    data = {};
  }

  if (!response.ok) {

    const error =
      new Error(
        data.message ||
        "Something went wrong"
      );

    error.status =
      response.status;

    throw error;
  }

  return data;
}


/* =========================================================
   AUTH UI
   ========================================================= */

function showAuth() {

  $("auth-section")
    ?.classList.remove("hidden");

  $("main-app")
    ?.classList.add("hidden");
}


function showApp() {

    $("auth-section")
        ?.classList.add("hidden");

    $("main-app")
        ?.classList.remove("hidden");

    updateUserUI();

    connectSocket();

    switchView("feed");
}


/* =========================================================
   UPDATE CURRENT USER UI
   ========================================================= */

function updateUserUI() {

  if (!currentUser) {
    return;
  }

  const name =
    currentUser.name ||
    currentUser.username ||
    "User";

  const username =
    currentUser.username ||
    "";

  const profile =
    currentUser.profile ||
    "";

  const pillName =
    $("pill-user-name");

  const pillHandle =
    $("pill-user-handle");

  const pillAvatar =
    $("pill-user-avatar");

  const createAvatar =
    $("create-post-avatar");


  if (pillName) {

    pillName.textContent =
      name;
  }


  if (pillHandle) {

    pillHandle.textContent =
      `@${username}`;
  }


  if (pillAvatar) {

    pillAvatar.src =
      profile;

    pillAvatar.alt =
      name;

    if (!profile) {

      pillAvatar.classList.add(
        "avatar-fallback"
      );
    }
  }


  if (createAvatar) {

    createAvatar.src =
      profile;

    createAvatar.alt =
      name;

    if (!profile) {

      createAvatar.classList.add(
        "avatar-fallback"
      );
    }
  }
}


/* =========================================================
   NORMAL LOGIN
   Backend:
   POST /api/auth/login
   ========================================================= */

async function handleSignin(event) {

  event.preventDefault();

  const email =
    $("signin-identifier")
      ?.value
      .trim();

  const password =
    $("signin-password")
      ?.value;


  if (!email || !password) {

    showToast(
      "Email and password are required.",
      "error"
    );

    return;
  }


  const button =
    $("form-signin")
      ?.querySelector(
        'button[type="submit"]'
      );


  try {

    if (button) {

      button.disabled = true;

      button.textContent =
        "Signing in...";
    }


    const data =
      await apiRequest(
        `${API}/auth/login`,
        {
          method: "POST",

          body: JSON.stringify({
            email,
            password
          })
        }
      );


    /*
     * Backend returns:
     *
     * {
     *   message,
     *   token,
     *   user
     * }
     */

    saveAuth(
      data.token,
      data.user
    );


    showToast(
      "Login successful!",
      "success"
    );


    $("form-signin")
      ?.reset();


    showApp();


    await loadInitialData();

  } catch (error) {

    console.error(
      "Login error:",
      error
    );

    showToast(
      error.message ||
      "Unable to sign in.",
      "error"
    );

  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        "Sign In";
    }
  }
}


/* =========================================================
   SIGNUP
   Backend:
   POST /api/auth/signup
   ========================================================= */

async function handleSignup(event) {

  event.preventDefault();


  const name =
    $("signup-name")
      ?.value
      .trim();

  const username =
    $("signup-username")
      ?.value
      .trim();

  const email =
    $("signup-email")
      ?.value
      .trim();

  const password =
    $("signup-password")
      ?.value;


  if (
    !name ||
    !username ||
    !email ||
    !password
  ) {

    showToast(
      "Please fill in all required fields.",
      "error"
    );

    return;
  }


  const button =
    $("form-signup")
      ?.querySelector(
        'button[type="submit"]'
      );


  try {

    if (button) {

      button.disabled = true;

      button.textContent =
        "Creating account...";
    }


    /*
     * Your current backend expects:
     *
     * name
     * username
     * email
     * password
     *
     * DOB is optional in your schema.
     */

    const data =
      await apiRequest(
        `${API}/auth/signup`,
        {
          method: "POST",

          body: JSON.stringify({
            name,
            username,
            email,
            password
          })
        }
      );


    showToast(
      data.message ||
      "Account created successfully!",
      "success"
    );


    $("form-signup")
      ?.reset();


    /*
     * Your signup controller does NOT
     * return a JWT.
     *
     * Therefore send the user to
     * Sign In after signup.
     */

    switchAuthTab("signin");


    if ($("signin-identifier")) {

      $("signin-identifier").value =
        email;
    }

  } catch (error) {

    console.error(
      "Signup error:",
      error
    );

    showToast(
      error.message ||
      "Unable to create account.",
      "error"
    );

  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        "Sign Up & Enter";
    }
  }
}


/* =========================================================
   GOOGLE LOGIN
   Backend:
   POST /api/auth/google-login
   Body:
   {
      credential
   }
   ========================================================= */

function initializeGoogleLogin() {

  const container =
    $("btn-google-login");

  if (!container) {
    return;
  }


  if (
    !window.google ||
    !window.google.accounts ||
    !window.google.accounts.id
  ) {

    console.warn(
      "Google Identity Services not loaded."
    );

    return;
  }


  if (
    !GOOGLE_CLIENT_ID ||
    GOOGLE_CLIENT_ID ===
    "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
  ) {

    console.warn(
      "Google Client ID has not been configured."
    );

    return;
  }


  /*
   * Clear our custom button.
   * Google will render its official button here.
   */

  container.innerHTML = "";

  container.classList.remove(
    "btn-google"
  );


  google.accounts.id.initialize({

    client_id:
      GOOGLE_CLIENT_ID,

    callback:
      handleGoogleCredential
  });


  google.accounts.id.renderButton(
    container,
    {
      theme: "outline",

      size: "large",

      text: "signin_with",

      shape: "rectangular",

      width: 320
    }
  );
}


/* =========================================================
   GOOGLE CREDENTIAL CALLBACK
   ========================================================= */

async function handleGoogleCredential(
  response
) {

  try {

    if (
      !response ||
      !response.credential
    ) {

      showToast(
        "Google did not return a credential.",
        "error"
      );

      return;
    }


    showToast(
      "Signing in with Google...",
      "info"
    );


    /*
     * Send Google's credential
     * to YOUR backend.
     *
     * Your backend then does:
     *
     * googleClient.verifyIdToken(...)
     */

    const data =
      await apiRequest(
        `${API}/auth/google-login`,
        {
          method: "POST",

          body: JSON.stringify({
            credential:
              response.credential
          })
        }
      );


    saveAuth(
      data.token,
      data.user
    );


    showToast(
      "Google login successful!",
      "success"
    );


    showApp();


    await loadInitialData();

  } catch (error) {

    console.error(
      "Google login error:",
      error
    );

    showToast(
      error.message ||
      "Google login failed.",
      "error"
    );
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

function handleLogout() {

    if (socket) {

        socket.disconnect();

        socket = null;
    }

    followingUsers = [];
    inboxUsers = [];
    searchUsersResults = [];
    activeChatUser = null;
    chatMessages = [];

    clearAuth();

    allPosts = [];
    allUsers = [];

    showAuth();

    switchAuthTab("signin");

    showToast(
        "You have been signed out.",
        "success"
    );
}


/* =========================================================
   AUTH TABS
   ========================================================= */

function switchAuthTab(tab) {

  const signinForm =
    $("form-signin");

  const signupForm =
    $("form-signup");

  const signinButton =
    $("tab-btn-signin");

  const signupButton =
    $("tab-btn-signup");


  if (tab === "signup") {

    signinForm
      ?.classList.remove("active");

    signupForm
      ?.classList.add("active");

    signinButton
      ?.classList.remove("active");

    signupButton
      ?.classList.add("active");

  } else {

    signupForm
      ?.classList.remove("active");

    signinForm
      ?.classList.add("active");

    signupButton
      ?.classList.remove("active");

    signinButton
      ?.classList.add("active");
  }
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function switchView(view) {

  currentView = view;


  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.view === view
      );
    });


  document
    .querySelectorAll(".view-panel")
    .forEach(panel => {

      panel.classList.remove(
        "active"
      );
    });


  const panel =
    $(`view-${view}`);


  if (panel) {

    panel.classList.add(
      "active"
    );
  }


  const titles = {

    feed: "Home",

    search: "Search",

    notifications:
      "Notifications",

    inbox:
      "Inbox",

    profile:
      "Profile"
  };


  if ($("header-title")) {

    $("header-title").textContent =
      titles[view] || "Nexus";
  }


  const feedTabs =
    $("feed-filter-tabs");


  if (feedTabs) {

    feedTabs.style.display =
      view === "feed"
        ? "flex"
        : "none";
  }


  if (view === "feed") {

    renderFeed(allPosts);
  }


  if (view === "search") {

    renderSearchPage();
  }


  if (view === "profile") {

    renderProfile();
  }


  if (view === "notifications") {

    renderUnavailableView(
      "Notifications are not connected yet.",
      "Your backend currently has no notification API."
    );
  }


  if (view === "inbox") {

    renderInbox();

    if (
        socket &&
        socket.connected
    ) {

        socket.emit(
            "load-following"
        );
    }
}
}

function connectSocket() {

    if (!currentToken) {
        return;
    }

    // Don't create multiple connections
    if (socket && socket.connected) {
        return;
    }

    socket = io({
        auth: {
            token: currentToken
        }
    });

    socket.on("connect", () => {

        console.log(
            "Socket connected:",
            socket.id
        );

        socket.emit(
            "load-following"
        );

        if (activeChatUser) {

            socket.emit(
                "load-messages",
                activeChatUser.id
            );
        }
    });

    socket.on("connect_error", (error) => {

        console.error(
            "Socket connection error:",
            error.message
        );

        showToast(
            "Realtime chat connection failed.",
            "error"
        );
    });

    socket.on("disconnect", () => {

        console.log(
            "Socket disconnected"
        );
    });


    // Following users
    socket.on(
        "following-list",
        (users) => {

            followingUsers =
                Array.isArray(users)
                    ? users
                    : [];

            inboxUsers = [
                ...followingUsers
            ];

            renderInbox();
        }
    );


    // Search results
    socket.on("search-results", (users) => {

    searchUsersResults =
        Array.isArray(users)
            ? users
            : [];

    // Only update the user list
    // Don't recreate the search input
    renderInboxUsersOnly();
});


    // Chat history
    socket.on(
        "chat-history",
        (messages) => {

            chatMessages =
                Array.isArray(messages)
                    ? messages
                    : [];

            renderChatMessages();
        }
    );


    // New real-time message
    socket.on(
        "private-message",
        (message) => {

            handleIncomingMessage(
                message
            );
        }
    );


    // A new chat was added
    socket.on(
        "chat-added",
        (user) => {

            if (!user?.id) {
                return;
            }

            const exists =
                inboxUsers.some(
                    item =>
                        String(item.id) ===
                        String(user.id)
                );

            if (!exists) {

                inboxUsers.push(user);
            }

            renderInbox();
        }
    );


    // Online/offline status
    socket.on(
        "user-status",
        ({ userId, online }) => {

            updateInboxUserStatus(
                userId,
                online
            );
        }
    );


    // Profile updated
    socket.on(
        "profile-updated",
        ({ userId, profile }) => {

            updateInboxUserProfile(
                userId,
                profile
            );
        }
    );
}


function renderInbox() {

    const container = $("inbox-container");

    if (!container) {
        return;
    }

    // Save current search text before rebuilding DOM
    const existingSearchInput =
        $("inbox-search-input");

    const currentSearch =
        existingSearchInput
            ? existingSearchInput.value
            : "";


    container.innerHTML = `

        <div class="inbox-layout">

            <div class="inbox-sidebar">

                <div class="inbox-search">

                    <i class="fa-solid fa-magnifying-glass"></i>

                    <input
                        type="text"
                        id="inbox-search-input"
                        placeholder="Search users..."
                        autocomplete="off"
                        value="${escapeHTML(currentSearch)}"
                    >

                </div>

                <div
                    class="inbox-user-sections"
                    id="inbox-user-sections"
                >
                    ${renderInboxUsers()}
                </div>

            </div>

            <div
                class="chat-panel"
                id="chat-panel"
            >
                ${renderEmptyChat()}
            </div>

        </div>
    `;


    setupInboxSearch();

    // Restore cursor/focus after rebuilding
    const newSearchInput =
        $("inbox-search-input");

    if (newSearchInput) {

        newSearchInput.focus();

        // Put cursor at the end
        newSearchInput.setSelectionRange(
            newSearchInput.value.length,
            newSearchInput.value.length
        );
    }


    if (activeChatUser) {
        renderActiveChat();
    }
}



function renderInboxUsers() {

    const following =
        followingUsers || [];

    const searchResults =
        searchUsersResults || [];


    let html = "";


    html += `

        <div class="inbox-section-title">

            Following

        </div>
    `;


    if (!following.length) {

        html += `

            <div class="inbox-empty-small">

                You are not following anyone yet.

            </div>
        `;

    } else {

        html += following
            .map(renderInboxUser)
            .join("");
    }


    if (
        searchResults.length
    ) {

        html += `

            <div class="inbox-section-title">

                Search Results

            </div>
        `;

        html += searchResults
            .map(renderInboxUser)
            .join("");
    }


    return html;
}

function renderInboxUsersOnly() {

    const section =
        $("inbox-user-sections");

    if (!section) {
        return;
    }

    section.innerHTML =
        renderInboxUsers();
}

function renderInboxUser(user) {

    const isActive =
        activeChatUser &&
        String(activeChatUser.id) ===
        String(user.id);


    return `

        <button
            type="button"
            class="inbox-user ${isActive ? "active" : ""}"
            data-inbox-user-id="${escapeHTML(user.id)}"
        >

            <div class="inbox-avatar-wrapper">

                ${avatarHTML(
                    user,
                    "avatar avatar-md"
                )}

                <span
                    class="online-dot ${
                        user.online
                            ? "online"
                            : ""
                    }"
                ></span>

            </div>


            <div class="inbox-user-info">

                <strong>
                    ${escapeHTML(
                        user.name ||
                        user.username ||
                        "User"
                    )}
                </strong>

                <span>
                    @${escapeHTML(
                        user.username || ""
                    )}
                </span>

            </div>

        </button>

    `;
}

function selectChatUser(userId) {

    const allUsers = [
        ...followingUsers,
        ...searchUsersResults,
        ...inboxUsers
    ];

    const user =
        allUsers.find(
            item =>
                String(item.id) ===
                String(userId)
        );

    if (!user) {
        return;
    }

    activeChatUser = user;

    chatMessages = [];

    renderInbox();

    if (!socket || !socket.connected) {

        showToast(
            "Chat connection is not ready.",
            "error"
        );

        return;
    }

    socket.emit(
        "load-messages",
        user.id
    );
}

function renderEmptyChat() {

    return `

        <div class="chat-empty">

            <div class="chat-empty-icon">

                <i class="fa-regular fa-comments"></i>

            </div>

            <h3>
                Select a user
            </h3>

            <p>
                Choose someone from your following
                or search for another user to start chatting.
            </p>

        </div>

    `;
}


function renderActiveChat() {

    const panel =
        $("chat-panel");

    if (!panel || !activeChatUser) {
        return;
    }


    panel.innerHTML = `

        <div class="chat-header">

            <div class="chat-header-user">

                ${avatarHTML(
                    activeChatUser,
                    "avatar avatar-sm"
                )}

                <div>

                    <strong>
                        ${escapeHTML(
                            activeChatUser.name ||
                            activeChatUser.username
                        )}
                    </strong>

                    <span>
                        @${escapeHTML(
                            activeChatUser.username
                        )}
                    </span>

                </div>

            </div>

            <span
                class="chat-online-status ${
                    activeChatUser.online
                        ? "online"
                        : ""
                }"
            >
                ${
                    activeChatUser.online
                        ? "Online"
                        : "Offline"
                }
            </span>

        </div>


        <div
            class="chat-messages"
            id="chat-messages"
        >

            ${renderMessagesHTML()}

        </div>


        <div class="chat-input-area">

            <input
                type="text"
                id="chat-message-input"
                placeholder="Write a message..."
                autocomplete="off"
            >

            <button
                type="button"
                id="chat-send-button"
                class="btn-primary"
            >

                <i class="fa-solid fa-paper-plane"></i>

            </button>

        </div>
    `;


    setupChatInput();

    scrollChatToBottom();
}

function renderMessagesHTML() {

    if (!chatMessages.length) {

        return `

            <div class="chat-no-messages">

                <p>
                    No messages yet.
                </p>

                <span>
                    Say hello 👋
                </span>

            </div>

        `;
    }


    return chatMessages
        .map(message => {

            const mine =
                String(message.senderId) ===
                String(
                    currentUser.id ||
                    currentUser._id
                );


            return `

                <div
                    class="chat-message-row ${
                        mine
                            ? "mine"
                            : "theirs"
                    }"
                >

                    <div
                        class="chat-message ${
                            mine
                                ? "mine"
                                : "theirs"
                        }"
                    >

                        ${escapeHTML(
                            message.message
                        )}

                        <span class="chat-message-time">

                            ${formatDate(
                                message.createdAt
                            )}

                        </span>

                    </div>

                </div>

            `;

        })
        .join("");
}

function renderChatMessages() {

    if (!activeChatUser) {
        return;
    }

    const messages =
        $("chat-messages");

    if (!messages) {
        return;
    }

    messages.innerHTML =
        renderMessagesHTML();

    scrollChatToBottom();
}

function scrollChatToBottom() {

    const messages =
        $("chat-messages");

    if (!messages) {
        return;
    }

    messages.scrollTop =
        messages.scrollHeight;
}

function sendChatMessage() {

    const input =
        $("chat-message-input");

    if (!input) {
        return;
    }

    const message =
        input.value.trim();

    if (!message) {
        return;
    }

    if (!activeChatUser) {

        showToast(
            "Select a user first.",
            "error"
        );

        return;
    }

    if (!socket || !socket.connected) {

        showToast(
            "Chat connection is not available.",
            "error"
        );

        return;
    }


    socket.emit(
        "private-message",
        {
            receiverId:
                activeChatUser.id,

            message
        }
    );


    input.value = "";

    input.focus();
}

function setupChatInput() {

    const input =
        $("chat-message-input");

    const button =
        $("chat-send-button");


    button?.addEventListener(
        "click",
        sendChatMessage
    );


    input?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                sendChatMessage();
            }
        }
    );
}


function handleIncomingMessage(message) {

    if (!message) {
        return;
    }


    const currentUserId =
        String(
            currentUser.id ||
            currentUser._id
        );


    const senderId =
        String(
            message.senderId
        );

    const receiverId =
        String(
            message.receiverId
        );


    const belongsToCurrentChat =
        activeChatUser &&
        (
            (
                senderId === currentUserId &&
                receiverId ===
                    String(activeChatUser.id)
            )
            ||
            (
                receiverId === currentUserId &&
                senderId ===
                    String(activeChatUser.id)
            )
        );


    if (belongsToCurrentChat) {

        const exists =
            chatMessages.some(
                item =>
                    String(item.id) ===
                    String(message.id)
            );

        if (!exists) {

            chatMessages.push(
                message
            );
        }

        renderChatMessages();
    }


    // Add the other user to the inbox
    const otherUserId =
        senderId === currentUserId
            ? receiverId
            : senderId;


    const existsInInbox =
        inboxUsers.some(
            user =>
                String(user.id) ===
                otherUserId
        );


    if (!existsInInbox) {

        inboxUsers.push({

            id: otherUserId,

            username:
                message.senderName ||
                "User",

            profile:
                message.senderProfile ||
                "",

            online: true
        });

        renderInbox();
    }
}

function setupInboxSearch() {

    const input =
        $("inbox-search-input");

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        event => {

            const search =
                event.target.value.trim();

            clearTimeout(searchTimer);

            if (!search) {

                searchUsersResults = [];

                renderInboxUsersOnly();

                return;
            }

            searchTimer = setTimeout(() => {

                if (
                    socket &&
                    socket.connected
                ) {

                    socket.emit(
                        "search-users",
                        search
                    );
                }

            }, 300);
        }
    );
}

function updateInboxUserStatus(
    userId,
    online
) {

    const id =
        String(userId);


    followingUsers =
        followingUsers.map(
            user => {

                if (
                    String(user.id) ===
                    id
                ) {

                    return {
                        ...user,
                        online
                    };
                }

                return user;
            }
        );


    inboxUsers =
        inboxUsers.map(
            user => {

                if (
                    String(user.id) ===
                    id
                ) {

                    return {
                        ...user,
                        online
                    };
                }

                return user;
            }
        );


    if (
        activeChatUser &&
        String(activeChatUser.id) === id
    ) {

        activeChatUser = {
            ...activeChatUser,
            online
        };
    }


    renderInbox();
}


function updateInboxUserProfile(
    userId,
    profile
) {

    const id =
        String(userId);


    followingUsers =
        followingUsers.map(
            user => {

                if (
                    String(user.id) === id
                ) {

                    return {
                        ...user,
                        profile
                    };
                }

                return user;
            }
        );


    inboxUsers =
        inboxUsers.map(
            user => {

                if (
                    String(user.id) === id
                ) {

                    return {
                        ...user,
                        profile
                    };
                }

                return user;
            }
        );


    if (
        activeChatUser &&
        String(activeChatUser.id) === id
    ) {

        activeChatUser = {
            ...activeChatUser,
            profile
        };
    }


    renderInbox();
}

/* =========================================================
   UNAVAILABLE VIEW
   ========================================================= */

function renderUnavailableView(
  title,
  description
) {

  const containers = {

    notifications:
      "notifications-container",

    inbox:
      "inbox-container"
  };


  const container =
    $(containers[currentView]);


  if (!container) {
    return;
  }


  container.innerHTML = `

        <div class="empty-state">

            <h3>
                ${escapeHTML(title)}
            </h3>

            <p>
                ${escapeHTML(description)}
            </p>

        </div>

    `;
}


/* =========================================================
   LOAD POSTS
   GET /api/tweets
   ========================================================= */

async function loadPosts() {

  try {

    const data =
      await apiRequest(
        `${API}/tweets`,
        {
          method: "GET"
        }
      );


    allPosts =
      Array.isArray(data.posts)
        ? data.posts
        : [];


    renderFeed(allPosts);


    return allPosts;

  } catch (error) {

    console.error(
      "Load posts error:",
      error
    );

    showToast(
      error.message ||
      "Unable to load posts.",
      "error"
    );

    return [];
  }
}


/* =========================================================
   RENDER FEED
   ========================================================= */

function renderFeed(posts) {

  const container =
    $("feed-container");


  if (!container) {
    return;
  }


  if (!posts.length) {

    container.innerHTML = `

            <div class="empty-state">

                <h3>
                    No posts yet
                </h3>

                <p>
                    Be the first person
                    to share something.
                </p>

            </div>

        `;

    return;
  }


  container.innerHTML =
    posts
      .map(renderPost)
      .join("");
}


/* =========================================================
   RENDER SINGLE POST
   ========================================================= */

function renderPost(post) {

  const author =
    post.author || {};


  const content =
    escapeHTML(
      post.content || ""
    );


  const media =
    post.media?.url
      ? `

                <div class="post-media">

                    <img
                        src="${escapeHTML(
        post.media.url
      )}"
                        alt="Post media"
                        loading="lazy"
                    >

                </div>

              `
      : "";


  const authorId =
    author._id ||
    author.id;


  const isOwner =
    currentUser &&
    authorId &&
    String(authorId) ===
    String(
      currentUser.id ||
      currentUser._id
    );


  return `

        <article
            class="post-card"
            data-post-id="${escapeHTML(
    post._id
  )}"
        >

            <div class="post-header">

                <div class="post-author">

                    ${avatarHTML(
    author,
    "avatar avatar-md"
  )}

                    <div class="post-author-info">

                        <strong>
                            ${escapeHTML(
    author.name ||
    author.username ||
    "User"
  )}
                        </strong>

                        <span>
                            @${escapeHTML(
    author.username ||
    ""
  )}
                        </span>

                    </div>

                </div>


                ${isOwner
      ? `

                        <div
                            class="post-owner-actions"
                        >

                            <button
                                type="button"
                                class="post-action-btn"
                                data-action="edit-post"
                                data-id="${escapeHTML(
        post._id
      )}"
                            >

                                <i
                                    class="fa-regular
                                    fa-pen-to-square"
                                ></i>

                            </button>


                            <button
                                type="button"
                                class="post-action-btn"
                                data-action="delete-post"
                                data-id="${escapeHTML(
        post._id
      )}"
                            >

                                <i
                                    class="fa-regular
                                    fa-trash-can"
                                ></i>

                            </button>

                        </div>

                    `
      : ""
    }

            </div>


            ${content
      ? `

                    <div class="post-content">

                        ${content.replace(
        /\n/g,
        "<br>"
      )}

                    </div>

                  `
      : ""
    }


            ${media}


            <div class="post-meta">

                ${formatDate(
      post.createdAt
    )}

            </div>


            <div class="post-actions">

                <button
    type="button"
    class="post-action-btn"
    data-action="open-comments"
    data-id="${escapeHTML(post._id)}"
>
    <i class="fa-regular fa-comment"></i>
    ${post.commentsCount || 0}
</button>


                <button
                    type="button"
                    class="post-action-btn"
                    disabled
                >

                    <i
                        class="fa-regular
                        fa-heart"
                    ></i>

                    ${post.likesCount || 0}

                </button>


                <button
                    type="button"
                    class="post-action-btn"
                    disabled
                >

                    <i
                        class="fa-solid
                        fa-chart-simple"
                    ></i>

                    ${post.viewsCount || 0}

                </button>

            </div>

        </article>

    `;
}


/* =========================================================
   CREATE POST
   POST /api/tweets
   ========================================================= */

async function createPost() {

  if (!currentToken) {

    showToast(
      "Please sign in first.",
      "error"
    );

    return;
  }


  const input =
    $("post-input-text");


  const content =
    input?.value.trim() || "";


  const imageURL =
    $("post-image-url-input")
      ?.value
      .trim() || "";


  if (!content && !imageURL) {

    showToast(
      "Write something before posting.",
      "error"
    );

    return;
  }


  const button =
    $("btn-submit-post");


  try {

    if (button) {

      button.disabled = true;

      button.textContent =
        "Posting...";
    }


    const payload = {

      content,

      media:
        imageURL
          ? {
            url: imageURL,
            type: "image"
          }
          : undefined,

      hashtags:
        extractHashtags(content),

      mentions: []
    };


    const data =
      await apiRequest(
        `${API}/tweets`,
        {
          method: "POST",

          body:
            JSON.stringify(
              payload
            )
        }
      );


    if (data.post) {

      /*
       * Backend createPost returns
       * the newly created post.
       *
       * It isn't populated yet,
       * so reload the feed after
       * creation.
       */

      await loadPosts();
    }


    if (input) {

      input.value = "";
    }


    if ($("post-image-url-input")) {

      $("post-image-url-input")
        .value = "";
    }


    removeImagePreview();

    updateCharCounter();


    showToast(
      "Post published!",
      "success"
    );

  } catch (error) {

    console.error(
      "Create post error:",
      error
    );

    showToast(
      error.message ||
      "Failed to create post.",
      "error"
    );

  } finally {

    if (button) {

      button.textContent =
        "Post";

      updateCharCounter();
    }
  }
}

/* =========================================================
   COMMENTS
   ========================================================= */

async function openComments(postId) {

  if (!postId) {
    return;
  }

  currentCommentPostId = postId;
  replyingToComment = null;

  const modal = $("comments-modal");

  if (!modal) {
    return;
  }

  modal.classList.remove("hidden");

  resetCommentReply();

  const container = $("comments-container");

  if (container) {
    container.innerHTML = `
            <div class="comments-loading">
                Loading comments...
            </div>
        `;
  }

  await loadComments(postId);
}

async function loadComments(postId) {

  try {

    const data = await apiRequest(
      `${API}/comments/post/${postId}`,
      {
        method: "GET"
      }
    );

    currentPostComments =
      Array.isArray(data.comments)
        ? data.comments
        : [];

    renderComments(currentPostComments);

  } catch (error) {

    console.error(
      "Load comments error:",
      error
    );

    const container =
      $("comments-container");

    if (container) {

      container.innerHTML = `
                <div class="empty-state">
                    <h3>Unable to load comments</h3>
                    <p>${escapeHTML(
        error.message ||
        "Something went wrong."
      )}</p>
                </div>
            `;
    }
  }
}


function buildCommentTree(comments) {

  const commentMap = new Map();
  const roots = [];

  comments.forEach(comment => {

    commentMap.set(
      String(comment._id),
      {
        ...comment,
        children: []
      }
    );

  });


  comments.forEach(comment => {

    const commentNode =
      commentMap.get(
        String(comment._id)
      );

    if (
      comment.parentComment &&
      commentMap.has(
        String(comment.parentComment)
      )
    ) {

      const parent =
        commentMap.get(
          String(comment.parentComment)
        );

      parent.children.push(
        commentNode
      );

    } else {

      roots.push(commentNode);

    }

  });

  return roots;
}

function renderComments(comments) {

  const container = $("comments-container");

  if (!container) {
    return;
  }

  const count = $("comments-count");

  if (count) {
    count.textContent =
      `${comments.length} ${comments.length === 1
        ? "comment"
        : "comments"
      }`;
  }

  if (!comments.length) {

    container.innerHTML = `
            <div class="comments-empty">
                <h3>No comments yet</h3>
                <p>Be the first to comment.</p>
            </div>
        `;

    return;
  }

  const tree = buildCommentTree(comments);

  container.innerHTML = tree
    .map(comment =>
      renderCommentNode(comment)
    )
    .join("");
}

function renderCommentNode(comment) {

  const author = comment.author || {};

  const commentId = comment._id;

  const authorId =
    author._id ||
    author.id;

  const isOwner =
    currentUser &&
    authorId &&
    String(authorId) ===
    String(
      currentUser.id ||
      currentUser._id
    );

  const children =
    comment.children || [];

  return `
        <div
            class="comment-node"
            data-comment-id="${escapeHTML(commentId)}"
        >

            <div class="comment-item">

                <div class="comment-avatar">
                    ${avatarHTML(
    author,
    "avatar avatar-sm"
  )}
                </div>

                <div class="comment-body">

                    <div class="comment-header">

                        <strong>
                            ${escapeHTML(
    author.name ||
    author.username ||
    "User"
  )}
                        </strong>

                        <span>
                            @${escapeHTML(
    author.username || ""
  )}
                        </span>

                    </div>

                    <div class="comment-text">
                        ${escapeHTML(
    comment.content || ""
  )}
                    </div>

                    <div class="comment-actions">

                        <button
                            type="button"
                            data-action="reply-comment"
                            data-id="${escapeHTML(commentId)}"
                        >
                            Reply
                        </button>

                        <button
                            type="button"
                            disabled
                        >
                            <i class="fa-regular fa-heart"></i>
                            ${comment.likesCount || 0}
                        </button>

                        ${isOwner
      ? `
                                    <button
                                        type="button"
                                        data-action="edit-comment"
                                        data-id="${escapeHTML(commentId)}"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        data-action="delete-comment"
                                        data-id="${escapeHTML(commentId)}"
                                    >
                                        Delete
                                    </button>
                                `
      : ""
    }

                    </div>

                </div>

            </div>

            ${children.length > 0
      ? `
                        <div class="comment-children">

                            ${children
        .map(child =>
          renderCommentNode(child)
        )
        .join("")}

                        </div>
                    `
      : ""
    }

        </div>
    `;
}

async function submitComment() {

  if (!currentToken) {

    showToast(
      "Please sign in first.",
      "error"
    );

    return;
  }


  if (!currentCommentPostId) {
    return;
  }


  const input =
    $("comment-input");

  const content =
    input?.value.trim() || "";


  if (!content) {

    showToast(
      "Write something first.",
      "error"
    );

    return;
  }


  const button =
    $("btn-submit-comment");


  try {

    if (button) {
      button.disabled = true;
      button.textContent =
        replyingToComment
          ? "Replying..."
          : "Commenting...";
    }


    const payload = {

      post:
        currentCommentPostId,

      content,

      parentComment:
        replyingToComment
          ? replyingToComment._id
          : null

    };


    const data =
      await apiRequest(
        `${API}/comments`,
        {
          method: "POST",

          body:
            JSON.stringify(
              payload
            )
        }
      );


    if (data.comment) {

      currentPostComments.push(
        data.comment
      );

    }


    input.value = "";

    resetCommentReply();

    updateCommentCharCount();

    await loadComments(
      currentCommentPostId
    );


    /*
     * Update the comment count
     * on the post in the feed.
     */
    const post =
      allPosts.find(
        item =>
          String(item._id) ===
          String(
            currentCommentPostId
          )
      );


    if (post) {

      post.commentsCount =
        currentPostComments.length;

      renderFeed(allPosts);

    }


    showToast(
      replyingToComment
        ? "Reply added!"
        : "Comment added!",
      "success"
    );

  } catch (error) {

    console.error(
      "Create comment error:",
      error
    );

    showToast(
      error.message ||
      "Unable to add comment.",
      "error"
    );

  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        "Comment";

    }

  }
}

function startCommentReply(commentId) {

  const comment =
    currentPostComments.find(
      item =>
        String(item._id) ===
        String(commentId)
    );

  if (!comment) {
    return;
  }


  replyingToComment = comment;


  const replyInfo =
    $("comment-reply-info");

  const replyText =
    $("comment-reply-text");


  if (replyInfo) {
    replyInfo.classList.remove(
      "hidden"
    );
  }


  if (replyText) {

    const username =
      comment.author?.username ||
      "user";

    replyText.textContent =
      `Replying to @${username}`;

  }


  const input =
    $("comment-input");

  if (input) {
    input.placeholder =
      "Write a reply...";
    input.focus();
  }

}

function resetCommentReply() {

  replyingToComment = null;


  const replyInfo =
    $("comment-reply-info");

  if (replyInfo) {
    replyInfo.classList.add(
      "hidden"
    );
  }


  const replyText =
    $("comment-reply-text");

  if (replyText) {
    replyText.textContent = "";
  }


  const input =
    $("comment-input");

  if (input) {
    input.placeholder =
      "Write a comment...";
  }

}

function closeComments() {

  const modal =
    $("comments-modal");

  if (modal) {
    modal.classList.add(
      "hidden"
    );
  }


  currentCommentPostId = null;
  replyingToComment = null;
  currentPostComments = [];

  const input =
    $("comment-input");

  if (input) {
    input.value = "";
  }

}

function updateCommentCharCount() {

  const input =
    $("comment-input");

  const counter =
    $("comment-char-count");

  if (!input || !counter) {
    return;
  }


  const remaining =
    280 - input.value.length;

  counter.textContent =
    remaining;
}

async function editComment(commentId) {

  const comment =
    currentPostComments.find(
      item =>
        String(item._id) ===
        String(commentId)
    );

  if (!comment) {
    return;
  }


  const newContent =
    prompt(
      "Edit your comment:",
      comment.content || ""
    );


  if (newContent === null) {
    return;
  }


  const content =
    newContent.trim();


  if (!content) {

    showToast(
      "Comment cannot be empty.",
      "error"
    );

    return;
  }


  try {

    const data =
      await apiRequest(
        `${API}/comments/${commentId}`,
        {
          method: "PATCH",

          body:
            JSON.stringify({
              content
            })
        }
      );


    if (data.comment) {

      const index =
        currentPostComments.findIndex(
          item =>
            String(item._id) ===
            String(commentId)
        );

      if (index !== -1) {

        currentPostComments[index] =
          data.comment;

      }

    }


    renderComments(
      currentPostComments
    );


    showToast(
      "Comment updated.",
      "success"
    );

  } catch (error) {

    console.error(
      "Edit comment error:",
      error
    );

    showToast(
      error.message ||
      "Unable to update comment.",
      "error"
    );
  }
}

async function deleteComment(commentId) {

  const confirmed =
    confirm(
      "Delete this comment and its replies?"
    );

  if (!confirmed) {
    return;
  }


  try {

    await apiRequest(
      `${API}/comments/${commentId}`,
      {
        method: "DELETE"
      }
    );


    await loadComments(
      currentCommentPostId
    );


    const post =
      allPosts.find(
        item =>
          String(item._id) ===
          String(
            currentCommentPostId
          )
      );


    if (post) {

      post.commentsCount =
        currentPostComments.length;

      renderFeed(allPosts);

    }


    showToast(
      "Comment deleted.",
      "success"
    );

  } catch (error) {

    console.error(
      "Delete comment error:",
      error
    );

    showToast(
      error.message ||
      "Unable to delete comment.",
      "error"
    );
  }
}
/* =========================================================
   EXTRACT HASHTAGS
   ========================================================= */

function extractHashtags(text = "") {

  const matches =
    text.match(
      /#[a-zA-Z0-9_]+/g
    ) || [];


  return [
    ...new Set(
      matches.map(
        tag =>
          tag
            .substring(1)
            .toLowerCase()
      )
    )
  ];
}


/* =========================================================
   DELETE POST
   DELETE /api/tweets/:id
   ========================================================= */

async function deletePost(postId) {

  const confirmed =
    confirm(
      "Are you sure you want to delete this post?"
    );


  if (!confirmed) {
    return;
  }


  try {

    await apiRequest(
      `${API}/tweets/${postId}`,
      {
        method: "DELETE"
      }
    );


    allPosts =
      allPosts.filter(
        post =>
          String(post._id) !==
          String(postId)
      );


    renderFeed(allPosts);


    showToast(
      "Post deleted.",
      "success"
    );

  } catch (error) {

    console.error(
      "Delete post error:",
      error
    );

    showToast(
      error.message ||
      "Unable to delete post.",
      "error"
    );
  }
}


/* =========================================================
   EDIT POST
   PATCH /api/tweets/:id
   ========================================================= */

async function editPost(postId) {

  const post =
    allPosts.find(
      item =>
        String(item._id) ===
        String(postId)
    );


  if (!post) {
    return;
  }


  const newContent =
    prompt(
      "Edit your post:",
      post.content || ""
    );


  if (newContent === null) {
    return;
  }


  try {

    const data =
      await apiRequest(
        `${API}/tweets/${postId}`,
        {
          method: "PATCH",

          body:
            JSON.stringify({

              content:
                newContent,

              media:
                post.media,

              hashtags:
                extractHashtags(
                  newContent
                ),

              mentions:
                post.mentions || []
            })
        }
      );


    const index =
      allPosts.findIndex(
        item =>
          String(item._id) ===
          String(postId)
      );


    if (
      index !== -1 &&
      data.post
    ) {

      /*
       * PATCH response doesn't
       * populate author.
       *
       * Keep the old populated
       * author.
       */

      allPosts[index] = {

        ...data.post,

        author:
          allPosts[index].author
      };
    }


    renderFeed(allPosts);


    showToast(
      "Post updated.",
      "success"
    );

  } catch (error) {

    console.error(
      "Edit post error:",
      error
    );

    showToast(
      error.message ||
      "Unable to update post.",
      "error"
    );
  }
}


/* =========================================================
   LOAD USERS
   GET /api/users
   ========================================================= */

async function renderWhoToFollow() {
  const container = $("suggestions-list");

  if (!container || !currentUser) return;

  const currentUserId = currentUser.id || currentUser._id;

  try {
    // Get users that the current user is already following
    const response = await fetch(`${API}/follows/me/following`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    const data = await response.json();

    const followingUsers = data.success
      ? data.users || []
      : [];

    // Store their IDs in a Set for fast checking
    const followingIds = new Set(
      followingUsers.map(
        user => String(user._id || user.id)
      )
    );

    // Remove:
    // 1. Current user
    // 2. Users already being followed
    const suggestions = allUsers.filter(user => {
      const userId = String(user._id || user.id);

      return (
        userId !== String(currentUserId) &&
        !followingIds.has(userId)
      );
    });

    // Show maximum 3 users
    const usersToShow = suggestions.slice(0, 3);

    if (!usersToShow.length) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No users to follow yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = usersToShow.map(user => {
      const userId = user._id || user.id;

      return `
        <div class="who-follow-user">

          ${avatarHTML(user, "avatar avatar-sm")}

          <div class="who-follow-info">
            <strong>
              ${escapeHTML(user.name || user.username)}
            </strong>

            <span>
              @${escapeHTML(user.username)}
            </span>
          </div>

          <button
            type="button"
            class="follow-btn"
            data-action="follow-user"
            data-id="${escapeHTML(userId)}"
          >
            Follow
          </button>

        </div>
      `;
    }).join("");

  } catch (error) {
    console.error(
      "Error loading follow suggestions:",
      error
    );

    container.innerHTML = `
      <div class="empty-state">
        <p>Unable to load suggestions.</p>
      </div>
    `;
  }
}

async function loadUsers() {
  try {
    const data = await apiRequest(`${API}/users`);

    allUsers = Array.isArray(data)
      ? data
      : data.users || [];

    renderWhoToFollow();

  } catch (error) {
    console.error("Failed to load users:", error);
  }
}


/* =========================================================
   SEARCH PAGE
   ========================================================= */

function renderSearchPage() {

  const input =
    $("page-search-input");


  if (input) {
    input.focus();
  }


  performSearch(
    input?.value || ""
  );
}


/* =========================================================
   SEARCH
   ========================================================= */

function performSearch(query) {

  const container =
    $("search-results-container");


  if (!container) {
    return;
  }


  const search =
    query
      .trim()
      .toLowerCase();


  if (!search) {

    container.innerHTML = `

            <div class="empty-state">

                <h3>
                    Search Nexus
                </h3>

                <p>
                    Search for users
                    or posts.
                </p>

            </div>

        `;

    return;
  }


  const users =
    allUsers.filter(user => {

      return (

        user.name
          ?.toLowerCase()
          .includes(search)

        ||

        user.username
          ?.toLowerCase()
          .includes(search)

        ||

        user.email
          ?.toLowerCase()
          .includes(search)
      );
    });


  const posts =
    allPosts.filter(post => {

      return (

        post.content
          ?.toLowerCase()
          .includes(search)

        ||

        post.hashtags?.some(
          tag =>
            tag
              .toLowerCase()
              .includes(
                search.replace(
                  "#",
                  ""
                )
              )
        )
      );
    });


  container.innerHTML = `

        ${users.length
      ? `

                <section
                    class="search-section"
                >

                    <h3>
                        People
                    </h3>

                    ${users
        .map(
          renderSearchUser
        )
        .join("")}

                </section>

              `
      : ""
    }


        ${posts.length
      ? `

                <section
                    class="search-section"
                >

                    <h3>
                        Posts
                    </h3>

                    ${posts
        .map(renderPost)
        .join("")}

                </section>

              `
      : ""
    }


        ${!users.length &&
      !posts.length
      ? `

                <div
                    class="empty-state"
                >

                    <h3>
                        No results
                    </h3>

                    <p>
                        Try another
                        keyword.
                    </p>

                </div>

              `
      : ""
    }

    `;
}


/* =========================================================
   SEARCH USER
   ========================================================= */

function renderSearchUser(user) {

  const userId = user._id || user.id;

  const isCurrentUser =
    currentUser &&
    String(userId) === String(
      currentUser.id || currentUser._id
    );

  return `
        <div
            class="search-user-result"
            data-user-id="${escapeHTML(userId)}"
        >

            ${avatarHTML(
    user,
    "avatar avatar-md"
  )}

            <div class="search-user-info">

                <strong>
                    ${escapeHTML(
    user.name ||
    user.username ||
    "User"
  )}
                </strong>

                <span>
                    @${escapeHTML(
    user.username || ""
  )}
                </span>

            </div>

            ${!isCurrentUser
      ? `
                        <button
                            type="button"
                            class="follow-btn"
                            data-action="follow-user"
                            data-id="${escapeHTML(userId)}"
                            data-following="false"
                        >
                            Follow
                        </button>
                    `
      : ""
    }

        </div>
    `;
}


/* =========================================================
   PROFILE
   GET /api/users/:id
   ========================================================= */

async function renderProfile() {

  if (!currentUser) {
    return;
  }


  let user =
    currentUser;


  const userId =
    currentUser.id ||
    currentUser._id;


  try {

    const data =
      await apiRequest(
        `${API}/users/${userId}`,
        {
          method: "GET"
        }
      );


    if (data.user) {

      user =
        data.user;


      currentUser = {

        ...currentUser,

        ...user,

        id:
          user._id ||
          userId
      };


      localStorage.setItem(
        "nexus_user",
        JSON.stringify(
          currentUser
        )
      );
    }

  } catch (error) {

    console.error(
      "Profile refresh error:",
      error
    );
  }


  if ($("profile-display-name")) {

    $("profile-display-name")
      .textContent =
      user.name ||
      user.username;
  }


  if ($("profile-display-handle")) {

    $("profile-display-handle")
      .textContent =
      `@${user.username || ""}`;
  }


  if ($("profile-display-email")) {

    $("profile-display-email")
      .textContent =
      user.email || "";
  }


  if ($("profile-display-bio")) {

    $("profile-display-bio")
      .textContent =
      user.bio ||
      "No bio yet.";
  }


  if ($("profile-following-count")) {

    $("profile-following-count")
      .textContent =
      user.followingCount || 0;
  }


  if ($("profile-followers-count")) {

    $("profile-followers-count")
      .textContent =
      user.followersCount || 0;
  }


  if ($("profile-posts-count")) {

    $("profile-posts-count")
      .textContent =
      user.postsCount || 0;
  }


  const avatar =
    $("profile-page-avatar");


  if (avatar) {

    avatar.src =
      user.profile || "";

    avatar.alt =
      user.name ||
      user.username ||
      "Profile";
  }


  const postsContainer =
    $("profile-posts-container");


  if (!postsContainer) {
    return;
  }


  const profilePosts =
    allPosts.filter(post => {

      const authorId =
        typeof post.author === "object"
          ? post.author?._id
          : post.author;


      return (
        String(authorId) ===
        String(
          user._id ||
          user.id
        )
      );
    });


  if (!profilePosts.length) {

    postsContainer.innerHTML = `

            <div class="empty-state">

                <h3>
                    No posts yet
                </h3>

                <p>
                    Your posts
                    will appear here.
                </p>

            </div>

        `;

    return;
  }


  postsContainer.innerHTML =
    profilePosts
      .map(renderPost)
      .join("");
}


/* =========================================================
   EDIT PROFILE MODAL
   ========================================================= */

function openEditProfileModal() {

  if (!currentUser) {
    return;
  }


  if ($("edit-profile-name")) {

    $("edit-profile-name")
      .value =
      currentUser.name || "";
  }


  if ($("edit-profile-bio")) {

    $("edit-profile-bio")
      .value =
      currentUser.bio || "";
  }


  if ($("edit-profile-avatar")) {

    $("edit-profile-avatar")
      .value =
      currentUser.profile || "";
  }


  $("modal-edit-profile")
    ?.classList.remove(
      "hidden"
    );
}


function closeEditProfileModal() {

  $("modal-edit-profile")
    ?.classList.add(
      "hidden"
    );
}


/* =========================================================
   SAVE PROFILE
   PATCH /api/users/:id
   ========================================================= */

async function saveProfile(event) {

  event.preventDefault();


  if (!currentUser) {
    return;
  }


  const userId =
    currentUser.id ||
    currentUser._id;


  const name =
    $("edit-profile-name")
      ?.value
      .trim();


  const bio =
    $("edit-profile-bio")
      ?.value
      .trim();


  const profile =
    $("edit-profile-avatar")
      ?.value
      .trim();


  try {

    const data =
      await apiRequest(
        `${API}/users/${userId}`,
        {
          method: "PATCH",

          body:
            JSON.stringify({

              name,

              bio,

              profile
            })
        }
      );


    if (data.user) {

      currentUser = {

        ...currentUser,

        ...data.user,

        id:
          data.user._id ||
          userId
      };


      localStorage.setItem(
        "nexus_user",
        JSON.stringify(
          currentUser
        )
      );
    }


    updateUserUI();


    await renderProfile();


    closeEditProfileModal();


    showToast(
      "Profile updated successfully.",
      "success"
    );

  } catch (error) {

    console.error(
      "Profile update error:",
      error
    );

    showToast(
      error.message ||
      "Unable to update profile.",
      "error"
    );
  }
}


/* =========================================================
   POST CHARACTER COUNTER
   ========================================================= */

function updateCharCounter() {

  const input =
    $("post-input-text");

  const counter =
    $("char-counter");

  const button =
    $("btn-submit-post");


  if (!input) {
    return;
  }


  const max =
    Number(input.maxLength) ||
    280;


  const remaining =
    max -
    input.value.length;


  if (counter) {

    counter.textContent =
      remaining;
  }


  if (button) {

    const hasText =
      input.value.trim()
        .length > 0;


    const hasImage =
      Boolean(
        $("post-image-url-input")
          ?.value
          .trim()
      );


    button.disabled =
      !hasText &&
      !hasImage;
  }
}


/* =========================================================
   IMAGE URL BAR
   ========================================================= */

function toggleImageURLBar() {

  $("image-url-bar")
    ?.classList.toggle(
      "hidden"
    );
}


function applyImageURL() {

  const input =
    $("post-image-url-input");


  const url =
    input?.value.trim();


  if (!url) {

    showToast(
      "Enter an image URL first.",
      "error"
    );

    return;
  }


  const preview =
    $("image-preview-img");


  const wrapper =
    $("image-preview-wrapper");


  if (preview) {

    preview.src =
      url;
  }


  wrapper
    ?.classList.remove(
      "hidden"
    );


  updateCharCounter();
}


function removeImagePreview() {

  if ($("post-image-url-input")) {

    $("post-image-url-input")
      .value = "";
  }


  if ($("image-preview-img")) {

    $("image-preview-img")
      .src = "";
  }


  $("image-preview-wrapper")
    ?.classList.add(
      "hidden"
    );


  updateCharCounter();
}


/* =========================================================
   EMOJI
   ========================================================= */

function insertEmoji() {

  const input =
    $("post-input-text");


  if (!input) {
    return;
  }


  const emoji =
    " 😊";


  const start =
    input.selectionStart;


  const end =
    input.selectionEnd;


  input.value =
    input.value.substring(
      0,
      start
    ) +

    emoji +

    input.value.substring(
      end
    );


  input.selectionStart =
    input.selectionEnd =
    start +
    emoji.length;


  updateCharCounter();


  input.focus();
}


/* =========================================================
   LOCAL IMAGE PREVIEW
   ========================================================= */

function handleLocalImagePreview(event) {

  const file =
    event.target.files?.[0];


  if (!file) {
    return;
  }


  const objectURL =
    URL.createObjectURL(file);


  const preview =
    $("image-preview-img");


  const wrapper =
    $("image-preview-wrapper");


  if (preview) {

    preview.src =
      objectURL;
  }


  wrapper
    ?.classList.remove(
      "hidden"
    );


  /*
   * IMPORTANT:
   *
   * Your backend currently does NOT
   * have a file upload endpoint.
   *
   * Therefore this only previews
   * the image.
   *
   * To permanently store it,
   * currently use the image URL
   * field.
   */

  showToast(
    "Image preview ready. Use an image URL to save it with the post.",
    "info"
  );
}

async function followUser(userId, button) {

  if (!currentToken) {
    showToast(
      "Please sign in first.",
      "error"
    );

    return;
  }

  try {

    button.disabled = true;
    button.textContent = "Following...";

    await apiRequest(
      `${API}/follows/${userId}`,
      {
        method: "POST"
      }
    );

    showToast(
      "User followed successfully!",
      "success"
    );

    // Refresh the suggestions list
    // This removes the user we just followed
    await renderWhoToFollow();

  } catch (error) {

    console.error(
      "Follow user error:",
      error
    );

    button.textContent = "Follow";

    showToast(
      error.message ||
      "Unable to follow user.",
      "error"
    );

  } finally {

    button.disabled = false;
  }
}

async function unfollowUser(userId, button) {

  if (!currentToken) {
    showToast(
      "Please sign in first.",
      "error"
    );

    return;
  }

  try {

    button.disabled = true;
    button.textContent = "Unfollowing...";

    await apiRequest(
      `${API}/follows/${userId}`,
      {
        method: "DELETE"
      }
    );

    button.textContent = "Follow";

    button.dataset.following = "false";
    button.dataset.action = "follow-user";

    button.classList.remove("following");

    showToast(
      "User unfollowed.",
      "success"
    );


    await renderProfile();

    const modal = $("follow-list-modal");

    if (
      modal &&
      !modal.classList.contains("hidden")
    ) {
      await openFollowList("following");
    }


  } catch (error) {

    console.error(
      "Unfollow user error:",
      error
    );

    button.textContent = "Following";

    showToast(
      error.message ||
      "Unable to unfollow user.",
      "error"
    );

  } finally {

    button.disabled = false;
  }
}

async function openFollowList(type) {

  if (!currentToken || !currentUser) {
    showToast(
      "Please sign in first.",
      "error"
    );

    return;
  }

  const modal = $("follow-list-modal");
  const title = $("follow-list-title");
  const container = $("follow-list-container");

  if (!modal || !title || !container) {
    console.error("Follow list modal elements not found.");
    return;
  }

  const userId =
    currentUser.id ||
    currentUser._id;

  if (!userId) {
    showToast(
      "Unable to identify user.",
      "error"
    );

    return;
  }

  title.textContent =
    type === "followers"
      ? "Followers"
      : "Following";

  container.innerHTML = `
    <div class="follow-list-loading">
      Loading...
    </div>
  `;

  modal.classList.remove("hidden");

  try {

    const endpoint =
      type === "followers"
        ? `${API}/follows/${userId}/followers`
        : `${API}/follows/${userId}/following`;

    const response = await fetch(endpoint, {
      headers: {
        Authorization:
          `Bearer ${currentToken}`
      }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Unable to load follow list."
      );
    }

    const users = data.users || [];

    if (!users.length) {

      container.innerHTML = `
        <div class="empty-state">
          <p>
            No ${type === "followers"
          ? "followers"
          : "following"
        } yet.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML = users.map(user => {

      const userId = user._id || user.id;

      return `
    <div class="follow-list-user">

      ${avatarHTML(
        user,
        "avatar avatar-sm"
      )}

      <div class="follow-list-info">

        <strong>
          ${escapeHTML(
        user.name ||
        user.username ||
        "User"
      )}
        </strong>

        <span>
          @${escapeHTML(
        user.username || ""
      )}
        </span>

      </div>

      ${type === "following"
          ? `
            <button
              type="button"
              class="follow-btn following"
              data-action="unfollow-user"
              data-id="${escapeHTML(userId)}"
            >
              Unfollow
            </button>
          `
          : ""
        }

    </div>
  `;

    }).join("");

  } catch (error) {

    console.error(
      "Open follow list error:",
      error
    );

    container.innerHTML = `
      <div class="empty-state">
        <p>
          Unable to load ${type === "followers"
        ? "followers"
        : "following"
      }.
        </p>
      </div>
    `;
  }
}

function closeFollowList() {

  const modal =
    $("follow-list-modal");

  if (!modal) return;

  modal.classList.add("hidden");
}

$("close-follow-list")?.addEventListener(
  "click",
  closeFollowList
);

$("follow-list-modal")?.addEventListener(
  "click",
  (event) => {

    if (
      event.target.id ===
      "follow-list-modal"
    ) {
      closeFollowList();
    }

  }
);

/* =========================================================
   DYNAMIC POST BUTTONS
   ========================================================= */

function handleDynamicClicks(event) {

  const button =
    event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const action =
    button.dataset.action;

  const id =
    button.dataset.id;


  // ---------- POSTS ----------

  if (action === "delete-post") {

    deletePost(id);

    return;
  }

  if (action === "edit-post") {

    editPost(id);

    return;
  }


  // ---------- FOLLOW ----------

  if (action === "follow-user") {

    followUser(id, button);

    return;
  }

  if (action === "unfollow-user") {

    unfollowUser(id, button);

    return;
  }


  // ---------- FOLLOW LISTS ----------

  if (action === "open-followers") {

    openFollowList("followers");

    return;
  }

  if (action === "open-following") {

    openFollowList("following");

    return;
  }


  // ---------- COMMENTS ----------

  if (action === "open-comments") {

    openComments(id);

    return;
  }

  if (action === "reply-comment") {

    startCommentReply(id);

    return;
  }

  if (action === "edit-comment") {

    editComment(id);

    return;
  }

  if (action === "delete-comment") {

    deleteComment(id);

    return;
  }

}


/* =========================================================
   LOAD INITIAL DATA
   ========================================================= */

async function loadInitialData() {

  await Promise.all([
    loadPosts(),
    loadUsers()
  ]);


  updateUserUI();


  if (currentView === "feed") {

    renderFeed(allPosts);
  }
}


/* =========================================================
   RESTORE LOGIN SESSION
   ========================================================= */

async function restoreSession() {

  const authenticated =
    loadAuth();


  if (!authenticated) {

    showAuth();

    return;
  }


  try {

    const userId =
      currentUser.id ||
      currentUser._id;


    /*
     * Get fresh user data from MongoDB.
     */

    const data =
      await apiRequest(
        `${API}/users/${userId}`,
        {
          method: "GET"
        }
      );


    if (data.user) {

      currentUser = {

        ...currentUser,

        ...data.user,

        id:
          data.user._id ||
          userId
      };


      localStorage.setItem(
        "nexus_user",
        JSON.stringify(
          currentUser
        )
      );
    }


    showApp();


    await loadInitialData();

  } catch (error) {

    console.error(
      "Session restore error:",
      error
    );


    /*
     * If the stored token is invalid,
     * remove it and return to login.
     */

    if (
      error.status === 401 ||
      error.status === 404
    ) {

      clearAuth();

      showAuth();

    } else {

      /*
       * If MongoDB temporarily fails,
       * don't immediately log the user out.
       */

      showApp();

      await loadInitialData();
    }
  }
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

  /* ---------- AUTH ---------- */

  $("form-signin")
    ?.addEventListener(
      "submit",
      handleSignin
    );


  $("form-signup")
    ?.addEventListener(
      "submit",
      handleSignup
    );


  $("tab-btn-signin")
    ?.addEventListener(
      "click",
      () =>
        switchAuthTab("signin")
    );


  $("tab-btn-signup")
    ?.addEventListener(
      "click",
      () =>
        switchAuthTab("signup")
    );


  $("switch-to-signup")
    ?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        switchAuthTab("signup");
      }
    );


  $("switch-to-signin")
    ?.addEventListener(
      "click",
      event => {

        event.preventDefault();

        switchAuthTab("signin");
      }
    );


  /* ---------- LOGOUT ---------- */

  $("btn-logout")
    ?.addEventListener(
      "click",
      handleLogout
    );


  /* ---------- NAVIGATION ---------- */

  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          switchView(
            button.dataset.view
          );
        }
      );
    });


  $("logo-home-trigger")
    ?.addEventListener(
      "click",
      () =>
        switchView("feed")
    );


  /* ---------- POST ---------- */

  $("post-input-text")
    ?.addEventListener(
      "input",
      updateCharCounter
    );


  $("post-image-url-input")
    ?.addEventListener(
      "input",
      updateCharCounter
    );


  $("btn-submit-post")
    ?.addEventListener(
      "click",
      createPost
    );


  $("btn-toggle-image-url")
    ?.addEventListener(
      "click",
      toggleImageURLBar
    );


  $("btn-apply-image-url")
    ?.addEventListener(
      "click",
      applyImageURL
    );


  $("btn-remove-preview")
    ?.addEventListener(
      "click",
      removeImagePreview
    );


  $("btn-insert-emoji")
    ?.addEventListener(
      "click",
      insertEmoji
    );


  $("post-file-input")
    ?.addEventListener(
      "change",
      handleLocalImagePreview
    );


  /* ---------- SEARCH ---------- */

  $("page-search-input")
    ?.addEventListener(
      "input",
      event => {

        performSearch(
          event.target.value
        );
      }
    );


  $("quick-search-input")
    ?.addEventListener(
      "input",
      event => {

        const value =
          event.target.value
            .trim();


        if (value) {

          switchView("search");


          if (
            $("page-search-input")
          ) {

            $("page-search-input")
              .value =
              value;
          }


          performSearch(
            value
          );
        }
      }
    );


  /* ---------- PROFILE ---------- */

  $("btn-edit-profile")
    ?.addEventListener(
      "click",
      openEditProfileModal
    );


  $("btn-close-edit-modal")
    ?.addEventListener(
      "click",
      closeEditProfileModal
    );


  $("btn-cancel-edit")
    ?.addEventListener(
      "click",
      closeEditProfileModal
    );


  $("form-edit-profile")
    ?.addEventListener(
      "submit",
      saveProfile
    );


  /* ---------- DYNAMIC POSTS ---------- */

  document.addEventListener(
    "click",
    handleDynamicClicks
  );


  /* ---------- MODAL ---------- */

  $("modal-edit-profile")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("modal-edit-profile")
        ) {

          closeEditProfileModal();
        }
      }
    );

  $("btn-close-comments")
    ?.addEventListener(
      "click",
      closeComments
    );


  $("btn-submit-comment")
    ?.addEventListener(
      "click",
      submitComment
    );


  $("btn-cancel-reply")
    ?.addEventListener(
      "click",
      resetCommentReply
    );


  $("comment-input")
    ?.addEventListener(
      "input",
      updateCommentCharCount
    );


  $("comment-input")
    ?.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {

          event.preventDefault();

          submitComment();

        }

      }
    );


  $("comments-modal")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("comments-modal")
        ) {

          closeComments();

        }

      }
    );

    $("inbox-container")
    ?.addEventListener(
        "click",
        event => {

            const userButton =
                event.target.closest(
                    "[data-inbox-user-id]"
                );

            if (!userButton) {
                return;
            }

            selectChatUser(
                userButton.dataset
                    .inboxUserId
            );
        }
    );
}


/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEventListeners();

    updateCharCounter();


    /*
     * Google Identity Services loads
     * asynchronously.
     *
     * Check periodically until
     * Google is available.
     */

    let attempts = 0;


    const googleTimer =
      setInterval(
        () => {

          attempts++;


          if (
            window.google &&
            window.google.accounts &&
            window.google.accounts.id
          ) {

            initializeGoogleLogin();

            clearInterval(
              googleTimer
            );
          }


          if (
            attempts >= 30
          ) {

            clearInterval(
              googleTimer
            );
          }

        },
        300
      );


    /*
     * Restore existing JWT
     * from localStorage.
     */

    restoreSession();
  }
);