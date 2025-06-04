document.addEventListener('DOMContentLoaded', function () {
    // Global variables
    let currentDate = new Date();
    let selectedDate = new Date();
    let userData = {};
    let startDate = selectedDate; // Default to currently selected date
    let endDate = selectedDate;   // Default to same day (single day task)

    const TASK_COLORS = {
        '#FF6B6B': { name: 'Red', class: 'color-red' },
        '#FFD93D': { name: 'Yellow', class: 'color-yellow' },
        '#6BCB77': { name: 'Green', class: 'color-green' },
        '#4D96FF': { name: 'Blue', class: 'color-blue' },
        '#A66DD4': { name: 'Purple', class: 'color-purple' },
        '#9E9E9E': { name: 'Gray', class: 'color-gray' },
        'none': { name: 'No Color', class: 'color-none' }
    };

    // Current sorting and view state
    let currentTodoSort = 'default';
    let currentTodoView = 'status';


    let userTier = 'premium'; // Default to all open til later.
    // DOM elements
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearElement = document.getElementById('month-year');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const todayButton = document.getElementById('today-button');
    const journalDateElement = document.getElementById('journal-date');
    const journalContentElement = document.getElementById('journal-content');
    const todoDateElement = document.getElementById('todo-date');
    const todoInput = document.getElementById('todo-input');
    const addTodoButton = document.getElementById('add-todo');
    const todoList = document.getElementById('todo-list');

    const savedAlpha = parseFloat(localStorage.getItem("todoAlpha") || "1");

    // Event listeners
    prevMonthButton.addEventListener('click', () => navigateMonth(-1));
    nextMonthButton.addEventListener('click', () => navigateMonth(1));
    todayButton.addEventListener('click', goToToday);
    document.getElementById('today_tab_button').addEventListener('click', goToToday);

    journalContentElement.addEventListener('input', debounce(saveJournal, 500));
    addTodoButton.addEventListener('click', addTodo);
    todoInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') addTodo();
    });


    function loadPremiumFeatures() {
        const premium_script = document.createElement('script');
        premium_script.src = 'premium.js';
        premium_script.defer = true;
        document.body.appendChild(premium_script);

        const google_sync_script = document.createElement('script');
        google_sync_script.src = 'google-sync.js';

        google_sync_script.onload = () => {
            console.log("✅ google-sync.js loaded");

            if (typeof updateAuthUI === 'function') {
                checkAuthStatus();
            } else {
                console.error("❌ updateAuthUI is still not defined after script load");
            }
        };

        document.body.appendChild(google_sync_script);
    }


    if (userTier === 'premium') {
        // console.log("welcome!",userTier);
        loadPremiumFeatures();
    } else {
        console.log("Premium features disabled for:", userTier);

        // hidePremiumUI();
        disablePremiumUI();
    }

    function hidePremiumUI() {
        document.querySelectorAll('[data-premium]').forEach(el => {
            el.style.display = 'none';
        });
    }
    function disablePremiumUI() {
        document.querySelectorAll('[data-premium]').forEach(el => {
            console.log("feature locked", el);
            el.classList.add('locked'); // add CSS styling
            el.title = 'Upgrade to Premium to unlock this feature';
            el.addEventListener('click', (e) => {
                e.preventDefault();
                alert('This feature is available in the Premium version.');
            });
        });
    }




    // Load data and initialize
    function initialize() {
        loadUserData().then(() => {
            renderCalendar();
            updateUI();
            // checkAuthStatus();
            setBackgroundImageSmooth('./images/abstract5.jpg');

            setInterval(updateClock, 1000);
            updateClock();
        });
    }


    // Clock
    function updateClock() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        document.getElementById('clock').textContent = `${hours}:${mins}`;
        document.getElementById('date').textContent = now.toDateString();
        document.getElementById('lock-clock').textContent = `${hours}:${mins}`;
        document.getElementById('lock-date').textContent = now.toDateString();
    }

    // Focus Input
    const focusInput = document.getElementById('focusInput');
    focusInput.value = localStorage.getItem('focus') || '';
    focusInput.addEventListener('input', () => {
        localStorage.setItem('focus', focusInput.value);
    });

    // Calendar functions
    function renderCalendar() {
        calendarGrid.innerHTML = '';

        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();

        // Update month and year display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        monthYearElement.textContent = `${monthNames[month]} ${year}`;

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Get days from previous month to fill the first row
        const firstDayOfWeek = firstDay.getDay();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        // Previous month days
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const date = new Date(year, month - 1, day);
            addDayToCalendar(date, true);
        }

        // Current month days
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            addDayToCalendar(date, false);
        }

        // Next month days to fill remaining grid
        const daysFromNextMonth = 42 - (firstDayOfWeek + lastDay.getDate());
        for (let day = 1; day <= daysFromNextMonth; day++) {
            const date = new Date(year, month + 1, day);
            addDayToCalendar(date, true);
        }
    }

    function addDayToCalendar(date, isOtherMonth) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        if (isOtherMonth) dayElement.classList.add('other-month');

        // Format to YYYY-MM-DD for data storage
        const dateString = formatDateString(date);
        dayElement.dataset.date = dateString;

        // Check if this day is today
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        // Check if this day is selected
        if (date.toDateString() === selectedDate.toDateString()) {
            dayElement.classList.add('selected');
        }

        // Check if this day has journal or todo content
        if (hasContent(dateString)) {
            if (hasJournal(dateString)) {
                dayElement.classList.add('has-journal');
            }
            if (hasTodo(dateString)) {
                dayElement.classList.add('has-content');
            }
        }

        dayElement.textContent = date.getDate();
        dayElement.addEventListener('click', () => selectDate(date));

        calendarGrid.appendChild(dayElement);
    }

    function navigateMonth(step) {
        selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + step, 1);
        renderCalendar();
    }

    function goToToday() {
        selectedDate = new Date();
        renderCalendar();
        updateUI();
    }

    function selectDate(date) {
        // console.log("selected", date);
        selectedDate = date;
        renderCalendar();
        updateUI();
    }

    // Journal and Todo functions
    function updateUI() {
        const dateString = formatDateString(selectedDate);

        // Format for display
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const displayDate = selectedDate.toLocaleDateString(undefined, options);

        journalDateElement.textContent = displayDate;
        todoDateElement.textContent = displayDate;

        // Load journal content
        journalContentElement.value = getJournalContent(dateString);

        // Load todos
        const isToday = dateString === formatDateString(new Date());
        const todoInput = document.getElementById("todo-input");

        if (!isToday) {
            todoInput.classList.add('hidden');
        } else {
            todoInput.classList.remove('hidden');
        }
        renderRollingTodoList(dateString);
    }

    function saveJournal() {
        showSyncStatus('Saving...');

        const dateString = formatDateString(selectedDate);
        if (!userData[dateString]) {
            userData[dateString] = { journal: '', todos: [] };
        }

        userData[dateString].journal = journalContentElement.value;
        saveUserData().then(() => {
            renderCalendar(); // Refresh calendar to show which days have content
            showSyncStatus('✓ Saved');
        });
    }

    function addTodo() {
        const todoText = todoInput.value.trim();
        if (!todoText) return;

        showSyncStatus('Saving...');

        const dateString = formatDateString(selectedDate);
        if (!userData[dateString]) {
            userData[dateString] = { journal: '', todos: [] };
        }

        userData[dateString].todos.push({
            id: Date.now().toString(),
            text: todoText,
            completed: false,
            isMultiDay: startDate.toDateString() !== endDate.toDateString(),
            startDate: formatDateString(startDate),
            endDate: formatDateString(endDate),
            progress: 0, // For future subtask integration
            color: generateTaskColor(todoText), // Optional: color coding for visual distinction
            subtasks: [] // Initialize with empty subtasks array
        });

        todoInput.value = '';

        saveUserData().then(() => {
            // renderTodoList(dateString);
            renderRollingTodoList(dateString);
            renderCalendar(); // Refresh calendar to show which days have content
            //showSyncStatus('✓ Saved');
        });
    }
    // Helper function to generate consistent colors based on task text
    function generateTaskColor(text) {
        // Simple hash function to generate a color based on the text
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = text.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Convert to RGB - using pastels for a dreamy look
        const r = 200 + (hash & 0xFF) % 55;
        const g = 200 + ((hash >> 8) & 0xFF) % 55;
        const b = 200 + ((hash >> 16) & 0xFF) % 55;

        return `rgb(${r}, ${g}, ${b})`;
    }
    // Calculate days between two dates
    function daysBetween(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const oneDayMs = 24 * 60 * 60 * 1000;
        return Math.round((endDate - startDate) / oneDayMs) + 1;
    }

    function toggleTodo(todoId, dateString) {
        showSyncStatus('Saving...');

        console.log(todoId, dateString );
        const todo = userData[dateString].todos.find(t => t.id === todoId);
        if (todo) {
            todo.completed = !todo.completed;
            saveUserData().then(() => {
                renderRollingTodoList(); // Use our new function here
                showSyncStatus('✓ Saved');
            });
        }
    }

    function deleteTodo(todoId, dateString) {
        if (!confirm("Are you sure you want to delete this task?")) return;

        showSyncStatus('Saving...');

        userData[dateString].todos = userData[dateString].todos.filter(t => t.id !== todoId);

        saveUserData().then(() => {
            renderRollingTodoList(); // Use our new function here
            renderCalendar();
            showSyncStatus('✓ Saved');
        });
    }


    // Storage and Sync functions
    function loadUserData() {
        return new Promise((resolve) => {
            const storedData = localStorage.getItem('dreamyTabData');
            if (storedData) {
                try {
                    userData = JSON.parse(storedData);
                } catch (e) {
                    console.error("Error parsing user data from localStorage", e);
                    userData = {};
                }
            } else {
                userData = {};
            }
            resolve();
        });
    }

    function saveUserData() {
        return new Promise((resolve) => {
            try {
                const jsonString = JSON.stringify(userData);
                localStorage.setItem('dreamyTabData', jsonString);

                // Optional: log item size
                console.log('Saved dreamyTabData, size:', jsonString.length, 'bytes');

                resolve();
            } catch (e) {
                console.error("Failed to save user data to localStorage", e);
                resolve(); // Still resolve to avoid breaking flows
            }
        });
    }





    // Helper functions
    function formatDateString(date) {
        // console.log(date);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }

    function getJournalContent(dateString) {
        if (userData[dateString] && userData[dateString].journal) {
            return userData[dateString].journal;
        }
        return '';
    }

    function hasContent(dateString) {
        if (!userData[dateString]) return false;

        return (
            (userData[dateString].journal && userData[dateString].journal.trim() !== '') ||
            (userData[dateString].todos && userData[dateString].todos.length > 0)
        );
    }

    function hasJournal(dateString) {
        if (!userData[dateString]) return false;

        return (
            (userData[dateString].journal && userData[dateString].journal.trim() !== '')
        );
    }

    function hasTodo(dateString) {
        if (!userData[dateString]) return false;

        return (
            (userData[dateString].todos && userData[dateString].todos.length > 0)
        );
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Modify the setBackgroundImageSmooth function to handle data URLs
    function setBackgroundImageSmooth(src) {
        // console.log("Setting background image:", src);

        const overlay = document.getElementById('bg-fade-overlay');
        const body = document.body;
        const lockOverlay = document.getElementById('lock-overlay');
        // Show overlay with new image
        overlay.style.backgroundImage = `url('${src}')`;
        overlay.style.opacity = 1;

        // After fade-in, replace body's background and hide overlay again
        setTimeout(() => {
            body.style.backgroundImage = `url('${src}')`;
            lockOverlay.style.backgroundImage = `url('${src}')`;

            overlay.style.opacity = 0;
        }, 1000); // Duration matches CSS transition
    }



    // Export/Import buttons
    const exportButton = document.getElementById('export-button');
    const importButton = document.getElementById('import-button');
    const backupModal = document.getElementById('backup-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalExportBtn = document.getElementById('modal-export-btn');
    const modalImportBtn = document.getElementById('modal-import-btn');

    // google sync related
    const modalGoogleImportBtn = document.getElementById('modal-google-drive-import-btn');
    const loginButton = document.getElementById('login-button'); // Assuming you have this element
    const syncNowButton = document.getElementById('sync-now'); // Assuming you have this element


    // Define modal functions
    function showBackupModal() {
        backupModal.style.display = 'block';
    }

    function hideModal() {
        // backupModal.style.display = 'none';
        document.getElementById('pin-modal').style.display = 'none';
    }

    // Event listeners for backup functionality
    // exportButton.addEventListener('click', showBackupModal); # use these to add fancy future functions using modal
    // importButton.addEventListener('click', showBackupModal);
    exportButton.addEventListener('click', function () {
        exportUserData();
        hideModal();
    });
    importButton.addEventListener('click', function () {
        importUserData();
        hideModal();
    });

    closeModal.addEventListener('click', hideModal);
    modalExportBtn.addEventListener('click', function () {
        exportUserData();
        // hideModal();
    });
    modalImportBtn.addEventListener('click', function () {
        importUserData();
        // hideModal();
    });

    
    // google sync
    modalGoogleImportBtn.addEventListener('click', function () {
        loadFromGoogleDrive();
        // hideModal();
    });
    // loginButton.addEventListener('click', function() {
    //     handleAuth();
    // });
    loginButton.addEventListener('click', function () {
        if (isLoggedIn) {
            logout(); // 🔁 Call logout if already logged in
        } else {
            handleAuth(); // 🔐 Otherwise, proceed with login
        }
    });


    syncNowButton.addEventListener('click', function() {
        syncData();
    });


    // Close modal when clicking outside of it
    window.addEventListener('click', function (event) {
        if (event.target === backupModal) {
            hideModal();
        }
    });


    // Initialize the app
    initialize();



    function exportUserData() {
        showSyncStatus('Preparing export...');

        // Create a downloadable file with the user data
        const dataStr = JSON.stringify(userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const today = new Date();
        const dateStr = formatDateString(today);
        const filename = `dreamy-tab-backup-${dateStr}.json`;

        // Create a temporary link element to trigger the download
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);

        showSyncStatus('✓ Data exported');
    }

    function importUserData() {
        // Create a file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            showSyncStatus('Importing data...');

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);

                    // Validate the imported data structure
                    if (typeof importedData !== 'object') {
                        throw new Error('Invalid data format');
                    }

                    // Merge the imported data with existing data
                    // This will prioritize imported data but keep any existing data not in the import
                    userData = { ...userData, ...importedData };

                    // Save the merged data
                    saveUserData().then(() => {
                        renderCalendar();
                        updateUI();
                        // showSyncStatus('✓ Data imported');
                    });
                } catch (error) {
                    console.error('Import error:', error);
                    // showSyncStatus('⚠️ Import failed');
                }
            };

            reader.readAsText(file);
        });

        // Trigger the file selection dialog
        fileInput.click();
    }







    // privacy features

    // Tab view switching functionality
    const viewTabs = document.querySelectorAll('.view-tab');
    const calendarSection = document.querySelector('.calendar-section');
    const journalSection = document.querySelector('.journal-section');
    const todoSection = document.querySelector('.todo-section');

    // Default view setting
    let currentView = 'all'; // Options: 'all', 'calendar', 'journal', 'todo'

    // Initialize view from storage
    function initializeView() {
        const savedView = localStorage.getItem('dreamyTabView');

        if (savedView) {
            currentView = savedView;
        }

        updateViewDisplay(currentView);

        // Update active tab
        viewTabs.forEach(tab => {
            if (tab.dataset.view === currentView) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }


    // Switch view function
    function switchView(view) {
        currentView = view;

        // Save preference
        localStorage.setItem('dreamyTabView', view);

        // Update UI
        updateViewDisplay(view);

        // Update active tab
        viewTabs.forEach(tab => {
            if (tab.dataset.view === view) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }



    function updateViewDisplay(view) {
        const container = document.querySelector('.container');

        container.classList.remove('view-all', 'view-calendar', 'view-journal', 'view-todo', 'todo-expanded');
        container.classList.add(`view-${view}`);

        if (container.classList.contains('view-todo')) {
            // console.log("expanding!!!");
            container.classList.add('todo-expanded');
        } else {
            container.classList.remove('todo-expanded');
        }

    }




    // Add event listeners to tabs
    viewTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchView(tab.dataset.view);
        });
    });

    // Initialize view settings
    initializeView();

    // Add keyboard shortcuts for quick view switching
    document.addEventListener('keydown', (e) => {
        if (e.altKey) {
            switch (e.key) {
                case '1':
                    switchView('all');
                    break;
                case '2':
                    switchView('calendar');
                    break;
                case '3':
                    switchView('journal');
                    break;
                case '4':
                    switchView('todo');
                    break;
            }
        }
    });


    function enablePrivacyMode() {
        // Initially blur or hide the journal content
        journalContentElement.classList.add('privacy-blur');

        // Show a placeholder text instead
        journalContentElement.setAttribute('data-placeholder', 'Click to view your journal');

        // Add event listener to reveal content on interaction
        journalContentElement.addEventListener('click', function () {
            if (this.classList.contains('privacy-blur')) {
                this.classList.remove('privacy-blur');
            }
        });
    }

    document.getElementById('todo-section').addEventListener('click', function () {
        enablePrivacyMode();
    });


//lock screen
    // Add to app.js

    // Lock screen functionality
    let isLocked = true; // Start locked by default
    const lockOverlay = document.getElementById('lock-overlay');
    const unlockButton = document.getElementById('unlock-button');
    const lockButton = document.getElementById('lock-button');
    const pinInput = document.getElementById('pin-input');
    const setLockButton = document.getElementById('set-lock-button');
    const lockSettingsButton = document.getElementById('lock-settings-button');
    const closePinModalButton = document.getElementById('close-pin-modal');

    // Function to toggle lock screen
    function toggleLockScreen(locked) {
        isLocked = locked;

        if (isLocked) {
            lockOverlay.classList.add('active');
            document.body.classList.add('locked');

            // Check if PIN is set
            const pin = localStorage.getItem('dreamyTabPin');
            if (pin) {
                pinInput.placeholder = "Enter your PIN";
                pinInput.style.display = "block";
            } else {
                pinInput.style.display = "none";
            }

        } else {
            lockOverlay.classList.remove('active');
            document.body.classList.remove('locked');
        }

        // Save preference
        localStorage.setItem('dreamyTabLocked', JSON.stringify(isLocked));
    }


    // Initialize lock state from storage
    function initializeLockScreen() {
        const lockedValue = localStorage.getItem('dreamyTabLocked');
        const pinValue = localStorage.getItem('dreamyTabPin');

        if (lockedValue !== null) {
            isLocked = JSON.parse(lockedValue);
        } else {
            // Default to locked on first use
            isLocked = true;
        }

        // Setup PIN if available
        if (pinValue) {
            hasPIN = true;
        }

        toggleLockScreen(isLocked);
    }


    // Unlock button click handler with smart behavior
    unlockButton.addEventListener('click', () => {
        // Add dreamy click effect
        unlockButton.classList.add('button-press');
        setTimeout(() => unlockButton.classList.remove('button-press'), 200);

        const savedPin = localStorage.getItem('dreamyTabPin');

        if (savedPin) {
            // PIN exists - validate it
            const enteredPin = pinInput.value;

            if (enteredPin === savedPin) {
                // Correct PIN - unlock with dreamy transition
                unlockButton.innerHTML = '✓ Unlocking...';
                setTimeout(() => {
                    toggleLockScreen(false);
                    pinInput.value = '';
                    unlockButton.innerHTML = 'Unlock'; // Reset text
                }, 600);
            } else {
                // Wrong PIN - show error with dreamy shake
                pinInput.classList.add('error');
                pinInput.style.display = "block";

                unlockButton.innerHTML = '✗ Try Again';
                setTimeout(() => {
                    pinInput.classList.remove('error');
                    unlockButton.innerHTML = 'Unlock';
                }, 1000);
            }

        } else {
            // No PIN exists - unlock immediately with smooth transition
            unlockButton.innerHTML = '✓ Unlocking...';
            setTimeout(() => {
                toggleLockScreen(false);
                unlockButton.innerHTML = 'Unlock';
            }, 400);
        }
    });


    // Lock button click handler
    lockButton.addEventListener('click', () => {
        toggleLockScreen(true);
    });


    // toggle settings modal
    lockSettingsButton.addEventListener('click', () => {
        const modal = document.getElementById('pin-modal');
        modal.style.display = 'block';
    });

    closePinModalButton.addEventListener('click', () => {
        const modal = document.getElementById('pin-modal');
        modal.style.display = 'none';
    });


    function showNotification(message, isSuccess = true) {
        const notification = document.getElementById('notification');

        // Set notification content and style
        notification.textContent = message;
        notification.className = 'notification'; // Reset class
        notification.classList.add(isSuccess ? 'success' : 'error');

        // Make visible
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
        }, 3000);
    }

    // Set PIN functionality
    setLockButton.addEventListener('click', () => {
        const currentPin = document.getElementById('current-pin').value;
        const newPin = document.getElementById('new-pin').value;

        // Validate current PIN if one exists
        const savedPin = localStorage.getItem('dreamyTabPin');

        if (savedPin && currentPin !== savedPin) {
            // Incorrect current PIN
            document.getElementById('current-pin').classList.add('error');
            setTimeout(() => document.getElementById('current-pin').classList.remove('error'), 500);
            return;
        }

        // Remove PIN if newPin is empty
        if (newPin === '') {
            localStorage.removeItem('dreamyTabPin');

            const modal = document.getElementById('pin-modal');
            modal.style.display = 'none';
            showNotification('PIN removed successfully');
        }

        // Set new PIN
        else if (newPin.length >= 4) {
            localStorage.setItem('dreamyTabPin', newPin);

            const modal = document.getElementById('pin-modal');
            modal.style.display = 'none';
            showNotification('PIN updated successfully');
        } else {
            document.getElementById('new-pin').classList.add('error');
            setTimeout(() => document.getElementById('new-pin').classList.remove('error'), 500);
        }

    });

    // Add unlock with keyboard shortcut (e.g., Escape key)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isLocked) {
            if (!document.getElementById('pin-modal').style.display === 'block') {
                unlockButton.click();
            }
        }
    });

    // Lock after inactivity
    let inactivityTimer;
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);

        // Get auto-lock time preference (default 5 minutes)
        const autoLockEnabled = localStorage.getItem('dreamyTabAutoLock') === 'true';
        const lockTime = parseInt(localStorage.getItem('dreamyTabAutoLockTime')) || 5; // default to 5 minutes

        if (autoLockEnabled) {
            inactivityTimer = setTimeout(() => {
                toggleLockScreen(true);
            }, lockTime * 60 * 1000);
        }

    }

    // Reset timer on user activity
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer);
    });

    // Initialize the lock screen when the extension loads
    initializeLockScreen();
    

    // advanced todo functions
    // function renderRollingTodoList() {
    //     todoList.innerHTML = '';
    //     console.log("rendering todo list", selectedDate);
    //     const currentDateString = formatDateString(selectedDate);

    //     let taskCount = 0;

    //     const isToday = currentDateString === formatDateString(new Date());

    //     // First collect all incomplete tasks from previous dates
    //     const pastTasks = [];
    //     const futureTasks = [];
    //     const completedTasks = [];
    //     const todayTasks = []; // <- NEW: Collect today's tasks separately
    //     const allTasks = [];
    //     const today = new Date();
    //     today.setHours(0, 0, 0, 0); // Set to beginning of today for proper comparison

    //     // Go through all dates in userData and find incomplete tasks
    //     Object.keys(userData).forEach(dateString => {
    //         // Parse the date string properly
    //         const [year, month, day] = dateString.split('-').map(Number);
    //         const taskDate = new Date(year, month - 1, day); // Month is 0-indexed

    //         if (userData[dateString]?.todos) {
    //             userData[dateString].todos.forEach(todo => {
    //                 if (!todo.originalDate){
    //                     todo.originalDate = dateString; // some older posts don't have any dates and only attached to the calendar date.
    //                 }
    //                 if (!todo.startDate) {
    //                     todo.startDate = todo.originalDate;
    //                 }

    //                 if (!todo.endDate) {
    //                     todo.endDate = todo.originalDate;
    //                 }

    //                 const [start_year, start_month, start_day] = todo.startDate.split('-').map(Number);
    //                 const [end_year, end_month, end_day] = todo.endDate.split('-').map(Number);
    //                 const startDate = new Date(start_year, start_month - 1, start_day);
    //                 const endDate = new Date(end_year, end_month - 1, end_day);

    //                 if (todo.completed) {
    //                     todo.originalDate = dateString; // attach context (optional)
    //                     completedTasks.push(todo); // no spread, keep reference
    //                 } else {
    //                     // NEW: Check if this task should appear in today's list
    //                     if (!todo.completed && startDate <= today && endDate >= today) {
    //                         todo.originalDate = dateString; // attach context (optional)
    //                         todayTasks.push(todo); // Add to today's tasks
    //                     } else if (startDate > today) {
    //                         todo.originalDate = dateString; // attach context (optional)
    //                         futureTasks.push(todo); // no spread, keep reference
    //                     } else if (endDate < today) {
    //                         todo.originalDate = dateString; // attach context (optional)
    //                         pastTasks.push(todo); // no spread, keep reference
    //                     }
    //                 }
    //             });
    //         }
    //     });

    //     // NEW: Sort today's tasks by displayOrder
    //     todayTasks.sort((a, b) => {
    //         // If both have displayOrder, use it
    //         if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
    //             return a.displayOrder - b.displayOrder;
    //         }
    //         // If only a has displayOrder, it comes first
    //         if (a.displayOrder !== undefined && b.displayOrder === undefined) {
    //             return -1;
    //         }
    //         // If only b has displayOrder, it comes first
    //         if (a.displayOrder === undefined && b.displayOrder !== undefined) {
    //             return 1;
    //         }
    //         // If neither has displayOrder, maintain original order (or sort by some other criteria)
    //         return 0;
    //     });

    //     // Create a drag/drop container for today's tasks
    //     const todayContainer = document.createElement('div');
    //     todayContainer.classList.add('task-group');
    //     todayContainer.dataset.groupType = 'today';

    //     if (todayTasks.length > 0) { // <- CHANGED: Use todayTasks.length instead of taskCount
    //         const todayHeader = document.createElement('h3');
    //         todayHeader.textContent = "Today's Tasks";
    //         todayHeader.classList.add('today-header');
    //         todayContainer.appendChild(todayHeader);
    //     }

    //     const todayList = document.createElement('ul');
    //     todayList.classList.add('todo-sublist');
    //     todayList.dataset.listType = 'today';
    //     todayList.dataset.dateString = currentDateString;

    //     // Add event listeners for drop target
    //     todayList.addEventListener('dragover', handleDragOver);
    //     todayList.addEventListener('dragenter', handleDragEnter);
    //     todayList.addEventListener('dragleave', handleDragLeave);
    //     todayList.addEventListener('drop', handleDrop);

    //     todayContainer.appendChild(todayList);
    //     todoList.appendChild(todayContainer);

    //     // NEW: Render today's tasks in the correct order
    //     todayTasks.forEach(todo => {
    //         const li = renderTodoItemForDragDrop(todo, false);
    //         todayList.appendChild(li);
    //     });

    //     // Create a drag/drop container for overdue tasks if there are any
    //     if (isToday && pastTasks.length > 0) {
    //         const overdueContainer = document.createElement('div');
    //         overdueContainer.classList.add('task-group');
    //         overdueContainer.dataset.groupType = 'overdue';

    //         const overdueHeader = document.createElement('h3');
    //         overdueHeader.textContent = 'Overdue';
    //         overdueHeader.classList.add('overdue-header');

    //         const overdueList = document.createElement('ul');
    //         overdueList.classList.add('todo-sublist');
    //         overdueList.dataset.listType = 'overdue';

    //         // Add event listeners for drop target 
    //         // we turn off overdue list listener so that we can't put today's tasks to overdue pile. it doesn't have dates, so can't assign anyway.
    //         // overdueList.addEventListener('dragover', handleDragOver);
    //         // overdueList.addEventListener('dragenter', handleDragEnter);
    //         // overdueList.addEventListener('dragleave', handleDragLeave);
    //         // overdueList.addEventListener('drop', handleDrop);

    //         overdueContainer.appendChild(overdueHeader);
    //         overdueContainer.appendChild(overdueList);
    //         todoList.appendChild(overdueContainer);

    //         // Render overdue tasks into this sublist
    //         pastTasks.forEach(todo => {
    //             const li = renderTodoItemForDragDrop(todo, true);
    //             overdueList.appendChild(li);
    //         });

    //         taskCount = pastTasks.length;
    //     }

    //     // Render future backlog
    //     if (isToday && futureTasks.length > 0) {
    //         const futureTasksContainer = document.createElement('div');
    //         futureTasksContainer.classList.add('task-group');
    //         futureTasksContainer.dataset.groupType = 'futuretasks';

    //         const futureTasksHeader = document.createElement('h3');
    //         futureTasksHeader.textContent = 'Upcoming';
    //         futureTasksHeader.classList.add('futuretasks-header');

    //         const futureTasksList = document.createElement('ul');
    //         futureTasksList.classList.add('todo-sublist');
    //         futureTasksList.dataset.listType = 'futuretasks';

    //         futureTasksContainer.appendChild(futureTasksHeader);
    //         futureTasksContainer.appendChild(futureTasksList);
    //         todoList.appendChild(futureTasksContainer);

    //         // Render future tasks into this sublist
    //         futureTasks.forEach(todo => {
    //             const li = renderTodoItemForDragDrop(todo, true);
    //             futureTasksList.appendChild(li);
    //         });

    //         taskCount = futureTasks.length;
    //     }

    //     // Render completed task list
    //     if (isToday && completedTasks.length > 0) {
    //         const completedTasksContainer = document.createElement('div');
    //         completedTasksContainer.classList.add('task-group');
    //         completedTasksContainer.dataset.groupType = 'completed'; // <- FIXED: was 'futuretasks'

    //         const completedTasksHeader = document.createElement('h3');
    //         completedTasksHeader.textContent = 'Completed';
    //         completedTasksHeader.classList.add('completed-header'); // <- FIXED: was 'futuretasks-header'

    //         const completedTasksList = document.createElement('ul');
    //         completedTasksList.classList.add('todo-sublist');
    //         completedTasksList.dataset.listType = 'completed'; // <- FIXED: was 'futuretasks'

    //         completedTasksContainer.appendChild(completedTasksHeader);
    //         completedTasksContainer.appendChild(completedTasksList);
    //         todoList.appendChild(completedTasksContainer);

    //         // Render completed tasks into this sublist
    //         completedTasks.forEach(todo => {
    //             const li = renderTodoItemForDragDrop(todo, true);
    //             completedTasksList.appendChild(li);
    //         });

    //         taskCount = completedTasks.length;
    //     }
    // }

    // Helper function to render individual todo items for drag-and-drop
    function renderTodoItemForDragDrop(todo, isOverdue) {
        // Skip if this is a multi-day task that's not the start date
        // (We only want to render multi-day tasks once, on their start date)
        // if (todo.isMultiDay && todo.startDate !== formatDateString(selectedDate) && !isOverdue) {
        //     return;
        // }
        // In the renderTodoItemForDragDrop function, update the subtask list creation:
        // console.log(todo);
        const li = document.createElement('li');
        li.classList.add('todo-item');
        if (todo.completed) li.classList.add('completed');
        if (isOverdue) li.classList.add('overdue');
        if (todo.isMultiDay) li.classList.add('multi-day-task');
        li.dataset.taskId = todo.id;

        // function hexToRgba(hex, alpha = 0.15) {
        //     const [r, g, b] = hex.match(/\w\w/g).map(x => parseInt(x, 16));
        //     return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        // }
        // if (todo.color) {
        //     li.style.backgroundColor = hexToRgba(todo.color, 0.15);
        // }


        if (todo.color) {
            li.style.borderLeft = `14px solid ${todo.color}`;
            li.style.borderBottom = `1px solid ${todo.color}`;
            li.style.backgroundColor = 'rgba(255, 255, 255, ${savedAlpha})';  // keep the translucent base
        }


        // Track if mouse is currently over this element or its children
        let mouseInside = false;

        li.addEventListener('dragover', (e) => {
            mouseInside = true;
            if (document.querySelector('.subtask-item.dragging')) {
                li.classList.add('show-subtask-dropzone');
            }
        });

        li.addEventListener('dragleave', (e) => {
            // Check if we're truly leaving the element
            // This event fires when moving to a child too, so we need to check
            // if the related target (what we're moving to) is within the li
            const related = e.relatedTarget;

            // If the element we're moving to is not within the li, we're truly leaving
            if (!li.contains(related)) {
                mouseInside = false;
                li.classList.remove('show-subtask-dropzone');
            }
        });

        li.addEventListener('drop', (e) => {
            mouseInside = false;
            li.classList.remove('show-subtask-dropzone');
        });


        // Add these attributes for drag and drop functionality
        li.draggable = true;
        li.dataset.dateString = todo.startDate || formatDateString(selectedDate);
        li.dataset.originalDate = isOverdue ? todo.originalDate : formatDateString(selectedDate);

        // Add drag event listeners
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragend', handleDragEnd);
        // end draggable insert


        // Add drag handle for better UX
        const dragHandle = document.createElement('div');
        dragHandle.classList.add('drag-handle');
        dragHandle.innerHTML = '⋮⋮'; // Vertical dots as drag handle

        const taskContent = document.createElement('div');
        taskContent.classList.add('task-content');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        // console.log(todo);
        checkbox.addEventListener('change', () => toggleTodo(todo.id, todo.originalDate || formatDateString(selectedDate)));

        taskContent.appendChild(checkbox);


        const taskText = document.createElement('span');
        taskText.classList.add('task-text');
        taskText.textContent = todo.text;

        taskContent.appendChild(taskText);

        // const isMultiDay =
        //     todo.startDate &&
        //     todo.endDate &&
        //     todo.startDate !== todo.endDate;
        // todo.isMultiDay = isMultiDay;


        // console.log(todo.isMultiDay);
        // For multi-day tasks, add date range and duration
        if (todo.isMultiDay) {
            const taskDetails = document.createElement('div');
            taskDetails.classList.add('task-details');

            const taskDates = document.createElement('span');
            taskDates.classList.add('task-dates');

            // Format dates for display
            const startDate = adjust_dateString(todo.startDate);
            const endDate = adjust_dateString(todo.endDate);

            const formattedStart = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const formattedEnd = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

            // console.log("render multiday todo item:", startDate, endDate);
            taskDates.textContent = `${formattedStart} - ${formattedEnd}`;

            const taskDuration = document.createElement('span');
            taskDuration.classList.add('task-duration');
            const days = daysBetween(todo.startDate, todo.endDate);
            taskDuration.textContent = days === 1 ? '1 day' : `${days} days`;

            taskDetails.appendChild(taskDates);
            taskDetails.appendChild(taskDuration);
            taskContent.appendChild(taskDetails);

            // Add progress bar (for future subtask integration)
            const progressBar = document.createElement('div');
            progressBar.classList.add('task-progress-bar');

            const progressFill = document.createElement('div');
            progressFill.classList.add('progress-fill');
            // progressFill.style.width = `${todo.progress || 0}%`;
            // Calculate progress based on subtasks if they exist
            if (todo.subtasks && todo.subtasks.length > 0) {
                const completedSubtasks = todo.subtasks.filter(subtask => subtask.completed).length;
                const progressPercentage = (completedSubtasks / todo.subtasks.length) * 100;
                progressFill.style.width = `${progressPercentage}%`;

                // Update the progress value in the todo object
                todo.progress = progressPercentage;
            } else {
                progressFill.style.width = `${todo.progress || 0}%`;
            }

            progressBar.appendChild(progressFill);
            taskContent.appendChild(progressBar);

            // Set border color based on task color
            if (todo.color) {
                li.style.borderLeft = `14px solid ${todo.color}`;
            }
        }

        // For overdue tasks, show the original date
        if (isOverdue) {
            const dateInfo = document.createElement('small');
            // if (todo.isMultiDay){
            //     const [year, month, day] = todo.endDate.split('-').map(Number);
            //     const taskDate = new Date(year, month - 1, day);
            //     dateInfo.textContent = 'Due ' + taskDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            // } else {
            //     const [year, month, day] = todo.originalDate.split('-').map(Number);
            //     const taskDate = new Date(year, month - 1, day);
            //     dateInfo.textContent = 'Due ' + taskDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            // }

            if (!todo.isMultiDay) { //multiday task already have some details time displayed.
                if (todo.endDate){
                    const [year, month, day] = todo.endDate.split('-').map(Number);
                    const taskDate = new Date(year, month - 1, day);
                    dateInfo.textContent = 'Due ' + taskDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                } else {
                    const [year, month, day] = todo.originalDate.split('-').map(Number);
                    const taskDate = new Date(year, month - 1, day);
                    dateInfo.textContent = 'Due ' + taskDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                }
            }
            dateInfo.classList.add('task-date');
            // taskText.appendChild(document.createElement('br'));
            taskText.appendChild(dateInfo);
        }

        // Task actions (edit, delete)
        const taskActions = document.createElement('div');
        taskActions.classList.add('task-actions');

        const editButton = document.createElement('button');
        editButton.classList.add('edit-task');
        // editButton.innerHTML = '✏️';
        editButton.innerHTML = '<i class="fas fa-edit"></i>'
        editButton.addEventListener('click', () => openTaskEditor(todo));
        taskActions.appendChild(editButton);

        // taskText.addEventListener('click', () => openTaskEditor(todo));
        taskText.addEventListener('click', () => toggleSubtaskPanel(todo, li));
        // Subtask button - NEW
        // const subtaskButton = document.createElement('button');
        // subtaskButton.classList.add('subtask-button');
        // subtaskButton.innerHTML = '🔽'; // Down arrow icon
        // subtaskButton.title = 'Manage subtasks';
        // subtaskButton.addEventListener('click', (e) => {
        //     e.stopPropagation(); // Prevent opening the task editor
        //     toggleSubtaskPanel(todo, li);
        // });

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-task');
        // deleteButton.innerHTML = '&times;';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>'
        deleteButton.addEventListener('click', () => deleteTodo(todo.id, todo.startDate || formatDateString(selectedDate)));

        // taskActions.appendChild(subtaskButton); // Add subtask button
        taskActions.append(editButton);
        taskActions.appendChild(deleteButton);

        li.appendChild(dragHandle);

        taskContent.appendChild(taskActions);

        // li.appendChild(checkbox);
        li.appendChild(taskContent);
        // li.appendChild(taskActions);

        // Create subtask container (initially hidden)
        const subtaskContainer = document.createElement('div');
        subtaskContainer.classList.add('subtask-container');
        subtaskContainer.style.display = 'block'; //change this to none if default to hide.

        // Add subtask input
        const subtaskInputContainer = document.createElement('div');
        subtaskInputContainer.classList.add('subtask-input-container');
        subtaskInputContainer.style.display = 'none'; // hide the input, not the subtasks.

        const subtaskInput = document.createElement('input');
        subtaskInput.type = 'text';
        subtaskInput.placeholder = 'Add a subtask...';
        subtaskInput.classList.add('subtask-input');

        const addSubtaskButton = document.createElement('button');
        addSubtaskButton.classList.add('add-subtask-button');
        addSubtaskButton.textContent = '+';
        addSubtaskButton.addEventListener('click', () => addSubtask(todo, subtaskInput, subtaskList));

        subtaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addSubtask(todo, subtaskInput, subtaskList);
            }
        });

        subtaskInputContainer.appendChild(subtaskInput);
        subtaskInputContainer.appendChild(addSubtaskButton);
        subtaskContainer.appendChild(subtaskInputContainer);

        // Create subtask list
        const subtaskList = document.createElement('ul');
        subtaskList.classList.add('subtask-list');

        subtaskList.dataset.taskId = todo.id;


        subtaskList.addEventListener('dragover', handleSubtaskDragOver);
        subtaskList.addEventListener('drop', handleSubtaskDrop);
        subtaskList.addEventListener('dragleave', handleSubtaskDragLeave);

        // Render existing subtasks if any
        // if (todo.subtasks && todo.subtasks.length > 0) {
            // todo.subtasks.forEach(subtask => {
            //     renderSubtask(subtask, subtaskList, todo);
            // });
            // Render existing subtasks or empty drop zone
        // }

        subtaskList.innerHTML = ''; // Clear existing subtasks

        if (todo.subtasks && todo.subtasks.length > 0) {
            todo.subtasks.forEach(subtask => {
                renderSubtask(subtask, subtaskList, todo);
            });
        } else {
            const emptyDropZone = document.createElement('li');
            emptyDropZone.classList.add('empty-subtask-dropzone');
            // Don’t add .visible by default!
            emptyDropZone.innerText = 'Drag subtasks here';
            subtaskList.appendChild(emptyDropZone);
        }


        subtaskContainer.appendChild(subtaskList);
        li.appendChild(subtaskContainer);

        // Important: return the li element instead of appending it
        return li;
    }



    // trying to place the editor next to task
    document.addEventListener("click", function (e) {
        const editButton = e.target.closest(".edit-task");
        if (!editButton) return;

        // Find the full todo item container
        const todoItem = editButton.closest(".todo-item");
        const modal = document.getElementById("task-editor-modal");

        if (!todoItem || !modal) return;

        // Get bounding rect of the entire todo item
        const rect = todoItem.getBoundingClientRect();

        // Calculate absolute position on page (accounting for scroll)
        const top = rect.bottom + window.scrollY;
        const left = rect.left + window.scrollX;

        // Set modal style and show it
        modal.style.position = "absolute";
        modal.style.top = `${top + 6}px`;   // small gap
        modal.style.left = `${left}px`;
        modal.style.display = "block";

        // Focus input inside modal if exists
        const input = modal.querySelector("input");
        if (input) input.focus();

        console.log("Modal positioned at:", modal.style.top, modal.style.left);
    });








    // Enhanced renderTodoItem function for multi-day tasks
    function renderTodoItem(todo, isOverdue) {
        li = renderTodoItemForDragDrop(todo, isOverdue)
        todoList.appendChild(li);
    }

    //background picker

    const backgroundModal = document.getElementById('background-modal');
    const closeBackgroundModal = document.getElementById('close-background-modal');
    const backgroundGrid = document.getElementById('background-grid');
    const customBgInput = document.getElementById('custom-bg-input');

    // Add a settings button to call the background picker
    const settingsContainer = document.querySelector('.sync-status');
    const bgPickerButton = document.createElement('button');
    bgPickerButton.id = 'bg-picker-button';
    // bgPickerButton.innerHTML = '<span class="icon"></span><span class="label">Background</span>';
    // bgPickerButton.innerHTML = '<span class="icon">⚙️</span>';
    bgPickerButton.innerHTML = '<span class="icon"><i class="fas fa-cog"></i></span>';

    bgPickerButton.title = 'Open Settings';
    settingsContainer.appendChild(bgPickerButton);

    // Background options
    const backgrounds = [
        { url: './images/abstract.jpg', name: 'Abstract 1' },
        { url: './images/abstract2.jpg', name: 'Abstract 2' },
        { url: './images/abstract3.jpg', name: 'Abstract 3' },
        { url: './images/abstract4.jpg', name: 'Abstract 4' },
        { url: './images/abstract5.jpg', name: 'Abstract 5' },
        { url: './images/nature1.jpg', name: 'Nature 1' },
        { url: './images/nature2.jpg', name: 'Nature 2' },
        { url: './images/nature3.jpg', name: 'Nature 3' },
        { url: './images/city1.jpg', name: 'City 1' },
        { url: './images/city2.jpg', name: 'City 2' },
        { url: './images/minimal1.jpg', name: 'Minimal 1' },
        { url: './images/minimal2.jpg', name: 'Minimal 2' }
    ];

    // Initialize background picker
    function initBackgroundPicker() {
        // Create background thumbnails
        backgroundGrid.innerHTML = '';
        backgrounds.forEach((bg, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.classList.add('bg-thumbnail');
            thumbnail.style.backgroundImage = `url('${bg.url}')`;
            thumbnail.dataset.bgUrl = bg.url;

            const name = document.createElement('div');
            name.classList.add('bg-thumbnail-name');
            name.textContent = bg.name;

            thumbnail.appendChild(name);
            backgroundGrid.appendChild(thumbnail);

            // Apply active class to current background
            const storedBg = localStorage.getItem('dreamyTabBackground');
            if (storedBg === bg.url) {
                thumbnail.classList.add('active');
            }


            // Add click event
            thumbnail.addEventListener('click', () => {
                // Remove active class from all thumbnails
                document.querySelectorAll('.bg-thumbnail').forEach(thumb => {
                    thumb.classList.remove('active');
                });

                // Add active class to selected thumbnail
                thumbnail.classList.add('active');

                // Set background
                setBackgroundImage(bg.url);
            });
        });
    }

    // Event listeners
    bgPickerButton.addEventListener('click', () => {
        backgroundModal.style.display = 'block';
        initBackgroundPicker();
    });

    closeBackgroundModal.addEventListener('click', () => {
        backgroundModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === backgroundModal) {
            backgroundModal.style.display = 'none';
        }
    });

    // Custom background upload
    customBgInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.match('image.*')) {
            const reader = new FileReader();

            reader.onload = function (e) {
                const imageUrl = e.target.result;

                // Remove active class from all thumbnails
                document.querySelectorAll('.bg-thumbnail').forEach(thumb => {
                    thumb.classList.remove('active');
                });

                // Set custom background
                setBackgroundImage(imageUrl);

                // Add custom background to thumbnails
                const customThumbnail = document.createElement('div');
                customThumbnail.classList.add('bg-thumbnail', 'active');
                customThumbnail.style.backgroundImage = `url('${imageUrl}')`;

                const name = document.createElement('div');
                name.classList.add('bg-thumbnail-name');
                name.textContent = 'Custom';

                customThumbnail.appendChild(name);
                backgroundGrid.appendChild(customThumbnail);

                customThumbnail.addEventListener('click', () => {
                    // Remove active class from all thumbnails
                    document.querySelectorAll('.bg-thumbnail').forEach(thumb => {
                        thumb.classList.remove('active');
                    });

                    // Add active class to selected thumbnail
                    customThumbnail.classList.add('active');

                    // Set background
                    setBackgroundImage(imageUrl);
                });
            };

            reader.readAsDataURL(file);
        }
    });

    // Set background function
    function setBackgroundImage(url) {
        setBackgroundImageSmooth(url);

        // Save preference
        localStorage.setItem('dreamyTabBackground', url);
    }

    // Load saved background on startup
    function loadSavedBackground() {
        const savedBg = localStorage.getItem('dreamyTabBackground');
        if (savedBg) {
            setBackgroundImageSmooth(savedBg);
        }
    }

    // Call this function when initializing the app
    loadSavedBackground();


    // multi day tasks
    // Additional DOM elements for multi-day tasks
    const toggleDateRangeButton = document.getElementById('toggle-date-range');
    const dateRangeSelector = document.getElementById('date-range-selector');
    const taskStartDateInput = document.getElementById('task-start-date');
    const taskEndDateInput = document.getElementById('task-end-date');
    const taskEditorModal = document.getElementById('task-editor-modal');
    const closeTaskEditorButton = taskEditorModal.querySelector('.close-modal');
    const editTaskTextInput = document.getElementById('edit-task-text');
    const editStartDateInput = document.getElementById('edit-start-date');
    const editEndDateInput = document.getElementById('edit-end-date');
    const saveTaskEditButton = document.getElementById('save-task-edit');


    function adjust_dateString(dateString){

        // FIX: Properly parse the date string to avoid timezone issues
        const [year, month, day] = dateString.split('-').map(Number);
        const adjustedDate = new Date(year, month - 1, day); // Month is 0-indexed in JavaScript Date
        return adjustedDate
    }

    function setDefaultDates() {
        // const today = new Date();
        // console.log("today:", today);
        // console.log("selected_date", selectedDate);
        // const formattedDate = formatDateString(today);
        formattedDate = formatDateString(selectedDate);
        taskStartDateInput.value = formattedDate;
        taskEndDateInput.value = formattedDate;
        // console.log(taskStartDateInput.value);        
    }
    setDefaultDates();


    // Toggle date range selector visibility
    toggleDateRangeButton.addEventListener('click', function () {
        dateRangeSelector.classList.toggle('visible');
        if (dateRangeSelector.classList.contains('visible')) {
            setDefaultDates();
        }
    });

    function addMultiDayTodo() {
        const todoText = todoInput.value.trim();
        if (!todoText) return;

        showSyncStatus('Saving...');

        // Get start and end dates
        console.log("default date:", selectDate);

        let startDate = selectedDate; // Default to currently selected date
        let endDate = selectedDate;   // Default to same day (single day task)
        
        // If date range selector is visible and has values, use those
        if (dateRangeSelector.classList.contains('visible')) {
            if (taskStartDateInput.value) {
                startDate = adjust_dateString(taskStartDateInput.value);
            }
            if (taskEndDateInput.value) {
                endDate = adjust_dateString(taskEndDateInput.value);
            }

            // Ensure end date is not before start date
            if (endDate < startDate) {
                endDate = startDate;
                taskEndDateInput.value = taskStartDateInput.value;
            }
        }

        // console.log(startDate, endDate);

        // Create task object
        const newTask = {
            id: Date.now().toString(),
            text: todoText,
            completed: false,
            isMultiDay: startDate.toDateString() !== endDate.toDateString(),
            startDate: formatDateString(startDate),
            endDate: formatDateString(endDate),
            progress: 0,
            color: generateTaskColor(todoText)
        };

        // Add to user data under the start date
        const startDateString = formatDateString(startDate);
        if (!userData[startDateString]) {
            userData[startDateString] = { journal: '', todos: [] };
        }
        userData[startDateString].todos.push(newTask);

        // Clear input
        todoInput.value = '';
        dateRangeSelector.classList.remove('visible');

        // Save and update UI
        saveUserData().then(() => {
            renderRollingTodoList();
            renderCalendar(); // Refresh calendar to show which days have content
            showSyncStatus('✓ Saved');
        });
    }
    // Override the addTodo function with our enhanced version
    addTodoButton.removeEventListener('click', addTodo);
    addTodoButton.addEventListener('click', addMultiDayTodo);
    // Update the keydown handler for todoInput
    todoInput.removeEventListener('keydown', e => {
        if (e.key === 'Enter') addTodo();
    });
    todoInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') addMultiDayTodo();
    });



    // Open task editor modal
    // function openTaskEditor(task) {
    //     editTaskTextInput.value = task.text;
    //     editStartDateInput.value = task.startDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3');
    //     editEndDateInput.value = task.endDate.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3');

    //     // Store the task ID for saving changes
    //     saveTaskEditButton.dataset.taskId = task.id;
    //     saveTaskEditButton.dataset.originalDate = task.startDate;

    //     // Show the modal
    //     taskEditorModal.style.display = 'block';
    // }

    function openTaskEditor(todo) {
        console.log("before", todo);

        // Your existing code to open the modal
        const modal = document.getElementById('task-editor-modal');
        const taskTextInput = document.getElementById('edit-task-text');
        const startDateInput = document.getElementById('edit-start-date');
        const endDateInput = document.getElementById('edit-end-date');
        const saveButton = document.getElementById('save-task-edit');

        // Set current values
        taskTextInput.value = todo.text;
        
        startDateInput.value = todo.startDate || formatDateString(selectedDate);
        endDateInput.value = todo.endDate || formatDateString(selectedDate);
        // console.log(startDateInput.value, selectedDate);
        // Get or create the subtasks section
        let subtasksSection = modal.querySelector('.subtasks-section');
        if (!subtasksSection) {
            subtasksSection = document.createElement('div');
            subtasksSection.classList.add('subtasks-section');

            const subtasksHeader = document.createElement('h4');
            subtasksHeader.textContent = 'Subtasks';
            subtasksSection.appendChild(subtasksHeader);

            // Insert subtasks section before the save button
            modal.querySelector('.modal-body').insertBefore(
                subtasksSection,
                document.getElementById('save-task-edit')
            );
        }

        // Clear previous subtasks
        while (subtasksSection.children.length > 1) {
            subtasksSection.removeChild(subtasksSection.lastChild);
        }

        // Add subtask input
        const subtaskInputGroup = document.createElement('div');
        subtaskInputGroup.classList.add('subtask-input-group');

        const subtaskInput = document.createElement('input');
        subtaskInput.type = 'text';
        subtaskInput.placeholder = 'Add a subtask...';
        subtaskInput.classList.add('edit-subtask-input');

        const addButton = document.createElement('button');
        addButton.textContent = '+';
        addButton.classList.add('add-subtask-btn');
        addButton.addEventListener('click', () => {
            addSubtaskInEditor(todo, subtaskInput, subtasksList);
        });

        subtaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addSubtaskInEditor(todo, subtaskInput, subtasksList);
            }
        });

        subtaskInputGroup.appendChild(subtaskInput);
        subtaskInputGroup.appendChild(addButton);
        subtasksSection.appendChild(subtaskInputGroup);

        // Create subtasks list
        const subtasksList = document.createElement('ul');
        subtasksList.classList.add('edit-subtasks-list');
        subtasksSection.appendChild(subtasksList);

        // Render existing subtasks
        if (todo.subtasks && todo.subtasks.length > 0) {
            todo.subtasks.forEach(subtask => {
                renderSubtaskInEditor(subtask, subtasksList, todo);
            });
        }

        // Show the modal
        modal.style.display = 'block';

        taskTextInput.focus();


        // Setup color picker
        let selectedColor = todo.color || '#6BCB77';  // Default color

        const colorSwatches = modal.querySelectorAll('.color-swatch');
        colorSwatches.forEach(swatch => {
            const swatchColor = swatch.dataset.color;
            swatch.classList.toggle('selected', swatchColor === selectedColor);

            swatch.addEventListener('click', () => {
                colorSwatches.forEach(s => s.classList.remove('selected'));
                swatch.classList.add('selected');
                selectedColor = swatchColor;
            });
        });



        // Update save button event handler
        saveButton.onclick = function () {
            todo.text = taskTextInput.value;
            todo.startDate = startDateInput.value;
            todo.endDate = endDateInput.value;
            todo.isMultiDay = startDateInput.value !== endDateInput.value;
            todo.color = selectedColor;

            console.log("after", todo);

            saveUserData().then(() => {
                modal.style.display = 'none';
                renderRollingTodoList(formatDateString(selectedDate));
                renderCalendar();
                showSyncStatus('✓ Saved');
            });
        };

    }
    // Helper functions for the task editor

    function addSubtaskInEditor(todo, inputElement, listElement) {
        const subtaskText = inputElement.value.trim();
        if (!subtaskText) return;

        // Create new subtask
        const subtask = {
            id: Date.now().toString(),
            text: subtaskText,
            completed: false
        };

        // Initialize subtasks array if needed
        if (!todo.subtasks) {
            todo.subtasks = [];
        }

        // Add subtask
        todo.subtasks.push(subtask);

        // Clear input
        inputElement.value = '';

        // Render the new subtask
        renderSubtaskInEditor(subtask, listElement, todo);

        // No need to save yet - this happens when the main task is saved
    }

    function renderSubtaskInEditor(subtask, listElement, parentTodo) {
        const li = document.createElement('li');
        li.classList.add('edit-subtask-item');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = subtask.completed;
        checkbox.addEventListener('change', () => {
            subtask.completed = checkbox.checked;
            if (checkbox.checked) {
                subtaskText.classList.add('completed');
            } else {
                subtaskText.classList.remove('completed');
            }
        });

        const subtaskText = document.createElement('span');
        subtaskText.textContent = subtask.text;
        if (subtask.completed) {
            subtaskText.classList.add('completed');
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.classList.add('delete-subtask-btn');
        deleteBtn.addEventListener('click', () => {
            // Find and remove subtask
            const index = parentTodo.subtasks.findIndex(st => st.id === subtask.id);
            if (index !== -1) {
                parentTodo.subtasks.splice(index, 1);
                li.remove();
            }
        });

        li.appendChild(checkbox);
        li.appendChild(subtaskText);
        li.appendChild(deleteBtn);

        listElement.appendChild(li);
    }

    // Close task editor
    closeTaskEditorButton.addEventListener('click', function () {
        taskEditorModal.style.display = 'none';
    });
    todoList.addEventListener('click', function () {
        taskEditorModal.style.display = 'none';
    });

    // Save task edits
    saveTaskEditButton.addEventListener('click', function () {
        const taskId = this.dataset.taskId;
        const originalDateString = this.dataset.originalDate;

        if (!taskId || !originalDateString) return;

        showSyncStatus('Saving...');

        // Find the task in userData
        const task = userData[originalDateString]?.todos.find(t => t.id === taskId);
        if (!task) return;

        // Update task properties
        task.text = editTaskTextInput.value.trim();
        const newStartDate = adjust_dateString(editStartDateInput.value);
        const newEndDate = adjust_dateString(editEndDateInput.value);

        // Ensure end date is not before start date
        if (newEndDate < newStartDate) {
            newEndDate.setTime(newStartDate.getTime());
        }

        const newStartDateString = formatDateString(newStartDate);
        const newEndDateString = formatDateString(newEndDate);
        // console.log("saving edits:", newStartDateString, newEndDateString);
        // Check if start date has changed
        if (newStartDateString !== originalDateString) {
            // Remove from original date entry
            userData[originalDateString].todos = userData[originalDateString].todos.filter(t => t.id !== taskId);

            // Add to new date entry
            if (!userData[newStartDateString]) {
                userData[newStartDateString] = { journal: '', todos: [] };
            }
            userData[newStartDateString].todos.push(task);
        }

        // Update date properties
        task.startDate = newStartDateString;
        task.endDate = newEndDateString;
        task.isMultiDay = newStartDate.toDateString() !== newEndDate.toDateString();

        // Save and update UI
        saveUserData().then(() => {
            taskEditorModal.style.display = 'none';
            renderRollingTodoList();
            renderCalendar();
            showSyncStatus('✓ Saved');
        });
    });
    // Close modal when clicking outside of it
    window.addEventListener('click', function (event) {
        if (event.target === taskEditorModal) {
            taskEditorModal.style.display = 'none';
        }
    });

    function enhancedRenderCalendar() {
        // Call original renderCalendar method
        originalRenderCalendar();

        // Add multi-day task indicators to calendar days
        const calendarDays = document.querySelectorAll('.calendar-day');

        calendarDays.forEach(dayElement => {
            const dateString = dayElement.dataset.date;
            if (!dateString) return;

            // Find all multi-day tasks that overlap with this date
            let tasksOnDay = [];

            // Scan through all dates in userData
            Object.keys(userData).forEach(taskDateString => {
                if (!userData[taskDateString]?.todos) return;

                // Check each task in this date
                userData[taskDateString].todos.forEach(task => {
                    if (!task.isMultiDay) return;

                    // Check if this task spans the current calendar day
                    const taskStartDate = adjust_dateString(task.startDate);
                    const taskEndDate = adjust_dateString(task.endDate);
                    const currentDate = adjust_dateString(dateString);

                    if (currentDate >= taskStartDate && currentDate <= taskEndDate) {
                        tasksOnDay.push(task);

                        // Add class for multi-day task first day
                        if (dateString === task.startDate) {
                            dayElement.classList.add('task-start');
                        }

                        // Add class for multi-day task last day
                        if (dateString === task.endDate) {
                            dayElement.classList.add('task-end');
                        }
                    }
                });
            });

            // Add visual indicators if there are multi-day tasks on this day
            if (tasksOnDay.length > 0) {
                dayElement.classList.add('has-multiday-tasks');

                // Add up to 2 task indicators (to avoid overcrowding)
                const maxDisplayTasks = Math.min(tasksOnDay.length, 2);
                for (let i = 0; i < maxDisplayTasks; i++) {
                    const task = tasksOnDay[i];
                    const indicator = document.createElement('div');
                    indicator.classList.add('task-span-indicator');

                    // Position indicators at different heights
                    indicator.style.bottom = `${18 + (i * 12)}px`;
                    // indicator.style.backgroundColor = `${task.color}`; // Add transparency

                    indicator.style.backgroundColor = hexToRgba(task.color, 0.3); // 0.3 = 30% opacity
                    indicator.style.borderLeftColor = task.color;

                    // Show text only for the first day of multi-day tasks
                    // if (dateString === task.startDate) {
                    //     indicator.textContent = task.text;
                    // }

                    dayElement.appendChild(indicator);
                }

                // If there are more tasks than we can show
                if (tasksOnDay.length > maxDisplayTasks) {
                    const moreIndicator = document.createElement('div');
                    moreIndicator.classList.add('more-tasks');
                    // moreIndicator.textContent = `+${tasksOnDay.length - maxDisplayTasks} more`;
                    moreIndicator.style.bottom = `${18 + (maxDisplayTasks * 12)}px`;
                    dayElement.appendChild(moreIndicator);
                }
            }
        });
    }
    function hexToRgba(color, alpha = 0.3) {
        if (color.startsWith("#") && color.length === 7) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else if (color.startsWith("rgb(")) {
            // Convert rgb(...) to rgba(...)
            const rgbValues = color.match(/\d+/g);
            if (rgbValues && rgbValues.length === 3) {
                return `rgba(${rgbValues[0]}, ${rgbValues[1]}, ${rgbValues[2]}, ${alpha})`;
            }
        }
        // Fallback: return original color if unrecognized
        return color;
    }


    // Override renderCalendar with our enhanced version
    const originalRenderCalendar = renderCalendar;
    renderCalendar = enhancedRenderCalendar;

    // Initialize
    setDefaultDates();



    //SUBTASK RELATED
    //NEW FUNCTIONS FOR SUBTASK MANAGEMENT

    // Toggle subtask panel visibility
    function toggleSubtaskPanel(todo, taskElement) {
        const subtaskContainer = taskElement.querySelector('.subtask-container');
        const subtaskButton = taskElement.querySelector('.subtask-button');
        const subtaskInputContainer = subtaskContainer.querySelector('.subtask-input-container'); // Fixed typo

        // no longer need the up down arrows anymore
        if (subtaskInputContainer.style.display === 'none') {
            subtaskInputContainer.style.display = 'block';
            // subtaskButton.innerHTML = '🔼'; // Up arrow icon when open
            // expandedTaskIds.add(todo.id); // Add to expanded set
        } else {
            subtaskInputContainer.style.display = 'none';
            // subtaskButton.innerHTML = '🔽'; // Fixed: Changed from subtaskInputContainer to subtaskButton
            // expandedTaskIds.delete(todo.id); // Remove from expanded set
        }
    }

    // Add a new subtask
    function addSubtask(todo, inputElement, subtaskListElement) {
        const subtaskText = inputElement.value.trim();
        if (!subtaskText) return;

        // Create new subtask object
        const subtask = {
            id: Date.now().toString(),
            text: subtaskText,
            completed: false
        };

        // Initialize subtasks array if it doesn't exist
        if (!todo.subtasks) {
            todo.subtasks = [];
        }

        // Add subtask to the todo
        todo.subtasks.push(subtask);

        // Clear input
        inputElement.value = '';

        // Render the new subtask
        renderSubtask(subtask, subtaskListElement, todo);

        // Update progress and save data
        updateTaskProgress(todo);
        saveUserData().then(() => {
            showSyncStatus('✓ Saved');
        });

        subtaskListElement.dataset.taskId = todo.id;

        subtaskListElement.addEventListener('dragover', handleSubtaskDragOver);
        subtaskListElement.addEventListener('drop', handleSubtaskDrop);

    }



    function renderSubtask(subtask, subtaskListElement, parentTodo) {
        const subtaskItem = document.createElement('li');
        subtaskItem.classList.add('subtask-item');
        subtaskItem.dataset.subtaskId = subtask.id;
        subtaskItem.dataset.taskId = parentTodo.id;
        subtaskItem.draggable = true;

        // Drag listeners
        subtaskItem.addEventListener('dragstart', handleSubtaskDragStart);
        subtaskItem.addEventListener('dragend', handleSubtaskDragEnd);

        const subtaskCheckbox = document.createElement('input');
        subtaskCheckbox.type = 'checkbox';
        subtaskCheckbox.checked = subtask.completed;
        subtaskCheckbox.addEventListener('change', () => toggleSubtask(subtask, parentTodo));

        const subtaskText = document.createElement('span');
        subtaskText.classList.add('subtask-text');
        subtaskText.textContent = subtask.text;
        if (subtask.completed) {
            subtaskText.classList.add('completed');
        }

        const deleteSubtaskButton = document.createElement('button');
        deleteSubtaskButton.innerHTML = '&times;';
        deleteSubtaskButton.classList.add('delete-subtask');
        deleteSubtaskButton.addEventListener('click', () => deleteSubtask(subtask.id, parentTodo));

        subtaskItem.append(subtaskCheckbox, subtaskText, deleteSubtaskButton);
        subtaskListElement.appendChild(subtaskItem);

        subtaskListElement.dataset.taskId = parentTodo.id;

        subtaskListElement.addEventListener('dragover', handleSubtaskDragOver);
        subtaskListElement.addEventListener('drop', handleSubtaskDrop);

    }


    // Toggle subtask completion
    function toggleSubtask(subtask, parentTodo) {
        subtask.completed = !subtask.completed;

        // Update the parent task's progress
        updateTaskProgress(parentTodo);

        // Save changes
        saveUserData().then(() => {
            // Update UI to reflect changes
            const dateString = formatDateString(selectedDate);
            renderRollingTodoList(dateString);
            showSyncStatus('✓ Saved');
        });
    }


    // Delete a subtask
    function deleteSubtask(subtaskId, parentTodo) {
        // Find the subtask index
        const subtaskIndex = parentTodo.subtasks.findIndex(st => st.id === subtaskId);
        if (subtaskIndex !== -1) {
            // Remove the subtask
            parentTodo.subtasks.splice(subtaskIndex, 1);

            // Update progress
            updateTaskProgress(parentTodo);

            // Save changes
            saveUserData().then(() => {
                // Re-render the to-do list
                const dateString = formatDateString(selectedDate);
                renderRollingTodoList(dateString);
                showSyncStatus('✓ Saved');
            });
        }
    }

    // Update task progress based on subtasks
    function updateTaskProgress(todo) {
        if (todo.subtasks && todo.subtasks.length > 0) {
            const completedSubtasks = todo.subtasks.filter(subtask => subtask.completed).length;
            todo.progress = (completedSubtasks / todo.subtasks.length) * 100;

            // Auto-complete the main task if all subtasks are completed
            if (completedSubtasks === todo.subtasks.length) {
                todo.completed = true;
            } else {
                todo.completed = false;
            }
        }
    }



    //drag and drop todo list
    // Variables to track the drag operation
    let draggedItem = null;
    let originalList = null;
    let dragPlaceholder = null;

    // Handle drag start event
    function handleDragStart(e) {
        draggedItem = this;
        originalList = this.parentNode;

        // Store the task information in the dataTransfer object
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({
            taskId: this.dataset.taskId,
            dateString: this.dataset.dateString,
            originalDate: this.dataset.originalDate
        }));

        // Add a class to style the dragged item
        this.classList.add('dragging');

        // Create a drag placeholder
        dragPlaceholder = document.createElement('li');
        dragPlaceholder.classList.add('drag-placeholder');
        dragPlaceholder.style.height = `${this.offsetHeight}px`;

        // Add a small delay to make the drag visual more clear
        // setTimeout(() => {
        //     this.style.opacity = '0.4';
        // }, 0);
        setTimeout(() => {
            this.style.display = 'none';
        }, 0);

    }

    // Handle drag end event
    function handleDragEnd() {
        this.classList.remove('dragging');
        // this.style.opacity = '';
        this.style.display = '';

        // Remove any remaining placeholders
        const placeholders = document.querySelectorAll('.drag-placeholder');
        placeholders.forEach(placeholder => placeholder.remove());

        // Reset drag tracking variables
        draggedItem = null;
        originalList = null;
        dragPlaceholder = null;

        // Remove drag-over class from all drop targets
        const dropTargets = document.querySelectorAll('.todo-sublist');
        dropTargets.forEach(target => target.classList.remove('drag-over'));
    }

    // Handle drag over event (needed to allow dropping)
    // function handleDragOver(e) {
    //     if (e.preventDefault) {
    //         e.preventDefault(); // Necessary to allow dropping
    //     }

    //     e.dataTransfer.dropEffect = 'move';

    //     // Find the closest todo item
    //     const closestItem = getDragAfterElement(this, e.clientY);

    //     // Remove existing placeholder
    //     if (dragPlaceholder.parentNode) {
    //         dragPlaceholder.remove();
    //     }

    //     // Insert placeholder at the appropriate position
    //     if (closestItem) {
    //         this.insertBefore(dragPlaceholder, closestItem);
    //     } else {
    //         this.appendChild(dragPlaceholder);
    //     }

    //     return false;
    // }

    // function handleDragOver(e) {
    //     e.preventDefault();

    //     const container = this; // .todo-sublist

    //     const afterElement = getDragAfterElement(container, e.clientY, '.todo-item');

    //     if (dragPlaceholder.parentNode) {
    //         dragPlaceholder.remove();
    //     }

    //     if (afterElement) {
    //         container.insertBefore(dragPlaceholder, afterElement);
    //     } else {
    //         container.appendChild(dragPlaceholder);
    //     }
    //     console.log('hovering', afterElement?.dataset.taskId || 'end');

    // }

    function handleDragOver(e) {
        e.preventDefault();

        const container = this; // .todo-sublist

        // Only proceed if dragPlaceholder exists
        if (!dragPlaceholder) {
            console.log('No dragPlaceholder available');
            return;
        }

        const afterElement = getDragAfterElement(container, e.clientY, '.todo-item');

        // Remove placeholder from its current position if it exists in the DOM
        if (dragPlaceholder.parentNode) {
            dragPlaceholder.remove();
        }

        // Insert placeholder at the new position
        if (afterElement) {
            container.insertBefore(dragPlaceholder, afterElement);
        } else {
            container.appendChild(dragPlaceholder);
        }
        // console.log('hovering', afterElement?.dataset.taskId || 'end');
    }

    // Helper function to find the position to insert the dragged subtask
    function getDragAfterElement(container, y, selector) {
        const elements = [...container.querySelectorAll(`${selector}:not(.dragging)`)];
        return elements.reduce((closest, el) => {
            const box = el.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: el };
            }
            return closest;
        }, { offset: -Infinity }).element;
    }


    // Handle drag enter event (for visual feedback)
    function handleDragEnter(e) {
        this.classList.add('drag-over');
    }

    // Handle drag leave event (for visual feedback)
    function handleDragLeave(e) {
        // Check if the related target is outside this list
        if (!this.contains(e.relatedTarget)) {
            this.classList.remove('drag-over');
        }
    }

    // Handle drop event (actual data manipulation)
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        this.classList.remove('drag-over');

        // Get the dragged task data
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const taskId = data.taskId;
        const originalDateString = data.originalDate;

        // Get the target date string (where we're dropping)
        const targetDateString = this.dataset.dateString || formatDateString(selectedDate);

        // If dragging to the same list, just handle the reordering
        if (originalDateString === targetDateString && originalList === this) {

            const sortButton = document.querySelector('.sort-button[data-sort="default"]');
            if (sortButton) {
                // If you need to trigger a click event instead:
                sortButton.click();
            }

            handleReordering(taskId, this);
            return;
        }

        // Move the task from the original date to the target date
        moveTaskToNewDate(taskId, originalDateString, targetDateString, dragPlaceholder);


    }

    // Handle reordering within the same list
    // function handleReordering(taskId, list) {
    //     // Ensure userData is initialized for this date
    //     const dateString = list.dataset.dateString || formatDateString(selectedDate);
    //     if (!userData[dateString]) {
    //         userData[dateString] = { journal: '', todos: [] };
    //     }

    //     // Find the task in the userData
    //     const taskIndex = userData[dateString].todos.findIndex(todo => todo.id === taskId);
    //     if (taskIndex === -1) return;

    //     // Remove the task from its current position
    //     const task = userData[dateString].todos.splice(taskIndex, 1)[0];

    //     // Find the new position for the task
    //     const allItems = Array.from(list.children);
    //     const placeholderIndex = allItems.indexOf(dragPlaceholder);

    //     // Insert the task at the new position in the data
    //     if (placeholderIndex > taskIndex) {
    //         // If moving down, account for the removed item
    //         userData[dateString].todos.splice(placeholderIndex - 1, 0, task);
    //     } else {
    //         userData[dateString].todos.splice(placeholderIndex, 0, task);
    //     }

    //     // Save and refresh
    //     saveUserData().then(() => {
    //         renderRollingTodoList();
    //         showSyncStatus('✓ Saved');
    //     });
    // }

    function handleReordering(taskId, list) {
        console.log('handleReordering called with:', { taskId, listClass: list.className, dataset: list.dataset });

        // For today's dynamic list, we need to handle cross-date reordering
        const isDynamicTodayList = list.classList.contains('todo-sublist') || list.dataset.isDynamic;

        console.log('isDynamicTodayList:', isDynamicTodayList);

        if (isDynamicTodayList) {
            handleTodayListReordering(taskId, list);
        } else {
            // Your existing logic for single-date lists
            console.log('Using original reordering logic');
            const dateString = list.dataset.dateString || formatDateString(selectedDate);
            if (!userData[dateString]) {
                userData[dateString] = { journal: '', todos: [] };
            }

            const taskIndex = userData[dateString].todos.findIndex(todo => todo.id === taskId);
            console.log('Found task at index:', taskIndex);

            if (taskIndex === -1) return;

            const task = userData[dateString].todos.splice(taskIndex, 1)[0];
            const allItems = Array.from(list.children);
            const placeholderIndex = allItems.indexOf(dragPlaceholder);

            console.log('Moving to placeholder index:', placeholderIndex);

            if (placeholderIndex > taskIndex) {
                userData[dateString].todos.splice(placeholderIndex - 1, 0, task);
            } else {
                userData[dateString].todos.splice(placeholderIndex, 0, task);
            }

            saveUserData().then(() => {
                renderRollingTodoList();
            });
        }
    }
    function handleTodayListReordering(taskId, list) {
        console.log('handleTodayListReordering called with taskId:', taskId);

        // Get all tasks currently displayed in today's list
        const displayedTasks = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Collect all tasks that should appear in today's list
        Object.keys(userData).forEach(dateString => {
            userData[dateString].todos.forEach(todo => {
                if (shouldTaskShowToday(todo, today)) {
                    displayedTasks.push({
                        task: todo,
                        dateString,
                        originalIndex: userData[dateString].todos.indexOf(todo)
                    });
                }
            });
        });

        console.log('Found displayedTasks:', displayedTasks.length);

        // Find the dragged task
        const draggedTaskData = displayedTasks.find(item => item.task.id === taskId);
        if (!draggedTaskData) {
            console.log('Could not find dragged task in displayed tasks');
            console.log('Available task IDs:', displayedTasks.map(item => item.task.id));
            console.log('Looking for task ID:', taskId);
            return;
        }

        // Get new position from placeholder
        const allItems = Array.from(list.children);
        const placeholderIndex = allItems.indexOf(dragPlaceholder);

        console.log('Placeholder index:', placeholderIndex);

        // Initialize displayOrder for tasks that don't have it
        displayedTasks.forEach((item, index) => {
            if (item.task.displayOrder === undefined) {
                item.task.displayOrder = index;
                console.log(`Initialized displayOrder ${index} for task: ${item.task.text}`);
            }
        });

        // Sort by current displayOrder to get the current visual order
        displayedTasks.sort((a, b) => {
            if (a.task.displayOrder !== undefined && b.task.displayOrder !== undefined) {
                return a.task.displayOrder - b.task.displayOrder;
            }
            return 0;
        });

        // Find the dragged task in the sorted array
        const draggedIndex = displayedTasks.findIndex(item => item.task.id === taskId);

        // Remove and reinsert at new position
        const [movedTask] = displayedTasks.splice(draggedIndex, 1);
        displayedTasks.splice(placeholderIndex, 0, movedTask);

        // Update displayOrder for all tasks based on new positions
        displayedTasks.forEach((item, index) => {
            item.task.displayOrder = index;
            console.log(`Set displayOrder ${index} for task: ${item.task.text}`);
        });

        console.log('Updated display orders, about to save');

        // Save and refresh
        saveUserData().then(() => {
            console.log('Data saved, about to re-render');
            renderRollingTodoList();
            showSyncStatus('✓ Saved');
        });
    }

    // Helper function to determine if a task should show in today's list
    function shouldTaskShowToday(task, today) {
        if (!task.startDate || !task.endDate) {
            return false;
        }

        const [start_year, start_month, start_day] = task.startDate.split('-').map(Number);
        const [end_year, end_month, end_day] = task.endDate.split('-').map(Number);
        const startDate = new Date(start_year, start_month - 1, start_day);
        const endDate = new Date(end_year, end_month - 1, end_day);

        // Task should show today if it's not completed and today falls within its date range
        return !task.completed && startDate <= today && endDate >= today;
    }
    // Move task to a different date

    function moveTaskToNewDate(taskId, fromDateString, toDateString, placeholder) {
        console.log('moveTaskToNewDate called:', { taskId, fromDateString, toDateString });

        // Find the task in the original date
        if (!userData[fromDateString]) {
            console.log('Source date not found:', fromDateString);
            return;
        }

        const taskIndex = userData[fromDateString].todos.findIndex(todo => todo.id === taskId);
        if (taskIndex === -1) {
            console.log('Task not found in source date');
            return;
        }

        const task = userData[fromDateString].todos[taskIndex];
        console.log('Found task:', task.text);

        // Check if we're moving to today's dynamic list
        const targetList = document.querySelector(`.todo-sublist[data-list-type="today"]`);
        const isMovingToTodaysList = targetList && targetList.dataset.dateString === toDateString;

        if (isMovingToTodaysList) {
            console.log('Moving to today\'s dynamic list');

            // For overdue tasks moved to today's list, extend the end date to today instead of moving the task
            const today = new Date();
            const todayString = formatDateString(today);

            // Update the task's end date to include today
            task.endDate = todayString;

            // If it's a past task (overdue), we might also want to update start date to today
            // This depends on your business logic - uncomment if you want the task to "restart" today
            // task.startDate = todayString;

            console.log('Updated task dates - endDate:', task.endDate);

            // Initialize displayOrder for proper positioning in today's list
            if (task.displayOrder === undefined) {
                // Find the highest displayOrder in today's tasks and add 1
                let maxOrder = -1;
                Object.keys(userData).forEach(dateString => {
                    userData[dateString].todos.forEach(todo => {
                        if (shouldTaskShowToday(todo, today) && todo.displayOrder !== undefined) {
                            maxOrder = Math.max(maxOrder, todo.displayOrder);
                        }
                    });
                });
                task.displayOrder = maxOrder + 1;
                console.log('Set displayOrder to:', task.displayOrder);
            }

        } else {
            console.log('Moving to regular date-specific list');

            // Ensure userData is initialized for target date
            if (!userData[toDateString]) {
                userData[toDateString] = { journal: '', todos: [] };
            }

            // Remove the task from its original date
            const removedTask = userData[fromDateString].todos.splice(taskIndex, 1)[0];

            // Update the task dates if it's a multi-day task
            if (removedTask.isMultiDay) {
                // Calculate the difference in days between the original start date and the new date
                const oldStart = new Date(removedTask.startDate);
                const newStart = new Date(toDateString);
                const dayDiff = Math.round((newStart - oldStart) / (1000 * 60 * 60 * 24));

                // Adjust both start and end dates by the same number of days
                const oldEnd = new Date(removedTask.endDate);
                const newEnd = new Date(oldEnd);
                newEnd.setDate(oldEnd.getDate() + dayDiff);

                removedTask.startDate = toDateString;
                removedTask.endDate = formatDateString(newEnd);
            } else {
                // For single-day tasks, just update the start date
                removedTask.startDate = toDateString;
                removedTask.endDate = toDateString;
            }

            // Find the new position for the task
            const targetListElement = document.querySelector(`.todo-sublist[data-date-string="${toDateString}"]`);

            if (targetListElement) {
                const allItems = Array.from(targetListElement.children);
                const placeholderIndex = allItems.indexOf(placeholder);

                // Insert the task at the new position in the data
                if (placeholderIndex !== -1) {
                    userData[toDateString].todos.splice(placeholderIndex, 0, removedTask);
                } else {
                    // If no placeholder was found, add to the end
                    userData[toDateString].todos.push(removedTask);
                }
            } else {
                // If target list couldn't be found, add to the end
                userData[toDateString].todos.push(removedTask);
            }
        }

        // Save and refresh
        saveUserData().then(() => {
            console.log('Saved, refreshing UI');
            renderRollingTodoList();
            renderCalendar(); // Refresh calendar to reflect the moved task
            showSyncStatus('✓ Saved');
        });
    }


    function initializeDragAndDrop() {
        // This function can be called when your app initializes

        // Make sure to render the lists with the drag and drop functionality
        renderRollingTodoList();

        // You might want to listen for events that would require re-rendering
        // the lists, such as switching dates
        document.addEventListener('dateChanged', function () {
            renderRollingTodoList();
        });
    }

    initializeDragAndDrop();

    // Subtask drag and drop variables
    let draggedSubtask = null;
    let subtaskDragPlaceholder = null;

    // function handleSubtaskDragStart(e) {
    //     draggedSubtask = this;
    //     this.classList.add('dragging');

    //     // Create a placeholder for better visual feedback
    //     subtaskDragPlaceholder = document.createElement('div');
    //     subtaskDragPlaceholder.classList.add('subtask-placeholder');
    //     subtaskDragPlaceholder.style.height = `${this.offsetHeight}px`;

    //     setTimeout(() => {
    //         this.style.opacity = '0.4';
    //     }, 0);

    //     e.dataTransfer.effectAllowed = 'move';
    //     e.dataTransfer.setData('text/plain', JSON.stringify({
    //         subtaskId: this.dataset.subtaskId,
    //         parentTaskId: this.dataset.parentTaskId,
    //         parentDateString: this.dataset.parentDateString
    //     }));
    // }

    // function handleSubtaskDragEnd() {
    //     this.classList.remove('dragging');
    //     this.style.opacity = '';

    //     // Remove placeholder
    //     if (subtaskDragPlaceholder && subtaskDragPlaceholder.parentNode) {
    //         subtaskDragPlaceholder.remove();
    //     }

    //     draggedSubtask = null;
    //     subtaskDragPlaceholder = null;
    // }
    function handleSubtaskDragStart(e) {
        e.stopPropagation();
        draggedSubtask = this;
        this.classList.add('dragging');

        subtaskDragPlaceholder = document.createElement('li');
        subtaskDragPlaceholder.classList.add('subtask-placeholder');
        subtaskDragPlaceholder.style.height = `${this.offsetHeight}px`;

        setTimeout(() => {
            this.style.display = 'none';
        }, 0);
    }

    // function handleSubtaskDragEnd(e) {
    //     e.stopPropagation();
    //     this.classList.remove('dragging');
    //     if (subtaskDragPlaceholder?.parentNode) {
    //         subtaskDragPlaceholder.remove();
    //     }
    //     draggedSubtask = null;
    //     document.querySelectorAll('.empty-subtask-dropzone.visible').forEach(zone => {
    //         zone.classList.remove('visible');
    //     });

    // }

    function handleSubtaskDragEnd(e) {
        e.stopPropagation();
        this.classList.remove('dragging');

        // Make the element visible again regardless of drag outcome
        this.style.display = '';  // Reset to default display value

        if (subtaskDragPlaceholder?.parentNode) {
            subtaskDragPlaceholder.remove();
        }

        draggedSubtask = null;
        document.querySelectorAll('.empty-subtask-dropzone.visible').forEach(zone => {
            zone.classList.remove('visible');
        });
    }

    function handleSubtaskDragLeave(e) {
        // If moving between children of the same list, ignore
        if (!this.contains(e.relatedTarget)) {
            const dropZone = this.querySelector('.empty-subtask-dropzone.visible');
            if (dropZone) {
                dropZone.classList.remove('visible');
            }
        }
    }




    // function handleSubtaskDragOver(e) {
    //     if (e.preventDefault) {
    //         e.preventDefault(); // Necessary to allow dropping
    //     }

    //     e.dataTransfer.dropEffect = 'move';

    //     // Find the closest subtask item
    //     const afterElement = getSubtaskDragAfterElement(this, e.clientY);

    //     // Remove existing placeholder if any
    //     if (subtaskDragPlaceholder.parentNode) {
    //         subtaskDragPlaceholder.remove();
    //     }

    //     // Insert placeholder at the correct position
    //     if (afterElement) {
    //         this.insertBefore(subtaskDragPlaceholder, afterElement);
    //     } else {
    //         this.appendChild(subtaskDragPlaceholder);
    //     }
    // }

    // function handleSubtaskDrop(e) {
    //     e.preventDefault();
    //     e.stopPropagation();

    //     const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    //     const subtaskId = data.subtaskId;
    //     const parentTaskId = data.parentTaskId;
    //     const parentDateString = data.parentDateString;

    //     // Get the parent task
    //     const parentTask = userData[parentDateString]?.todos.find(t => t.id === parentTaskId);
    //     if (!parentTask || !parentTask.subtasks) return;

    //     // Find the subtask index
    //     const subtaskIndex = parentTask.subtasks.findIndex(st => st.id === subtaskId);
    //     if (subtaskIndex === -1) return;

    //     // Remove the subtask from its current position
    //     const subtask = parentTask.subtasks.splice(subtaskIndex, 1)[0];

    //     // Find the new position based on the placeholder
    //     const allSubtasks = Array.from(this.children);
    //     const placeholderIndex = allSubtasks.indexOf(subtaskDragPlaceholder);

    //     // Insert at new position
    //     if (placeholderIndex !== -1) {
    //         parentTask.subtasks.splice(placeholderIndex, 0, subtask);
    //     } else {
    //         parentTask.subtasks.push(subtask);
    //     }

    //     // Save changes
    //     saveUserData().then(() => {
    //         renderRollingTodoList();
    //         showSyncStatus('✓ Saved');
    //     });
    // }


    function handleSubtaskDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        const container = this; // This is the <ul class="subtask-list">
        // console.log("container", container)
        const afterElement = getDragAfterElement(container, e.clientY, '.subtask-item');

        // Show empty drop zone if present
        const dropZone = container.querySelector('.empty-subtask-dropzone');
        if (dropZone) {
            dropZone.classList.add('visible');
        }

        if (subtaskDragPlaceholder.parentNode) {
            subtaskDragPlaceholder.remove();
        }

        if (afterElement) {
            container.insertBefore(subtaskDragPlaceholder, afterElement);
        } else {
            container.appendChild(subtaskDragPlaceholder);
        }
    }

    function handleSubtaskDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedSubtask || !subtaskDragPlaceholder) return;

        const container = this;

        const emptyDropZone = container.querySelector('.empty-subtask-dropzone');
        if (emptyDropZone) emptyDropZone.remove();

        container.insertBefore(draggedSubtask, subtaskDragPlaceholder);
        subtaskDragPlaceholder.remove();

        // Update the data structure
        // const taskId = draggedSubtask.dataset.taskId;
        // const task = todos.find(t => t.id === taskId);
        // if (task) {
        //     const reordered = Array.from(container.children)
        //         .filter(el => el.classList.contains('subtask-item'))
        //         .map(el => task.subtasks.find(st => st.id === el.dataset.subtaskId));
        //     task.subtasks = reordered;
        //     saveUserData?.(); // optional persistence
        // }

        // const taskId = draggedSubtask.dataset.taskId;
        // const result = getTaskById(taskId);

        // if (result) {
        //     const { task, date } = result;

        //     const reordered = Array.from(container.children)
        //         .filter(el => el.classList.contains('subtask-item'))
        //         .map(el => task.subtasks.find(st => st.id === el.dataset.subtaskId))
        //         .filter(Boolean); // in case of inconsistencies

        //     task.subtasks = reordered;
        //     saveUserData(); // now it will definitely be called
        // }

        const subtaskId = draggedSubtask.dataset.subtaskId;
        const fromTaskId = draggedSubtask.dataset.taskId;
        const toTaskId = container.dataset.taskId;

        const from = getTaskById(fromTaskId);
        const to = getTaskById(toTaskId);

        if (!from || !to) return;

        const fromTask = from.task;
        const toTask = to.task;

        // Remove subtask from old task
        const subtaskIndex = fromTask.subtasks.findIndex(st => st.id === subtaskId);
        if (subtaskIndex === -1) return;

        const [movedSubtask] = fromTask.subtasks.splice(subtaskIndex, 1);

        // Reorder subtasks in new task based on drop position
        const reordered = Array.from(container.children)
            .filter(el => el.classList.contains('subtask-item'))
            .map(el => {
                const id = el.dataset.subtaskId;
                return id === subtaskId ? movedSubtask : toTask.subtasks.find(st => st.id === id);
            })
            .filter(Boolean);

        toTask.subtasks = reordered;

        saveUserData();

        // Optional: visually refresh both source and target tasks
        if (from.date === to.date) {
            renderRollingTodoList(from.date);
        } else {
            renderRollingTodoList(from.date);
            renderRollingTodoList(to.date);
        }


        draggedSubtask = null;
        subtaskDragPlaceholder = null;

        const dropZone = container.querySelector('.empty-subtask-dropzone');
        if (dropZone) {
            dropZone.classList.remove('visible');
        }

    }

    function getTaskById(taskId) {
        for (const [date, data] of Object.entries(userData)) {
            const task = data.todos?.find(t => t.id === taskId);
            if (task) return { task, date };
        }
        return null;
    }




    //search

    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        searchResults.innerHTML = '';

        if (!query) {
            searchResults.classList.remove('visible');
            return;
        }

        const results = [];

        for (const [date, data] of Object.entries(userData)) {
            const journalMatch = data.journal && data.journal.toLowerCase().includes(query);

            const taskMatch = data.todos?.some(todo =>
                todo.text.toLowerCase().includes(query) ||
                todo.subtasks?.some(sub => sub.text.toLowerCase().includes(query))
            );

            if (journalMatch || taskMatch) {
                let snippet = '';

                if (journalMatch) {
                    snippet = data.journal.slice(0, 100);
                } else {
                    const matchedTodo = data.todos.find(todo =>
                        todo.text.toLowerCase().includes(query) ||
                        todo.subtasks?.some(sub => sub.text.toLowerCase().includes(query))
                    );

                    if (matchedTodo) {
                        if (matchedTodo.text.toLowerCase().includes(query)) {
                            snippet = matchedTodo.text;
                        } else {
                            const matchedSubtask = matchedTodo.subtasks.find(sub =>
                                sub.text.toLowerCase().includes(query)
                            );
                            snippet = matchedSubtask?.text || '';
                        }
                    }
                }

                results.push({ date, snippet, source: journalMatch ? 'journal' : 'todo' });
            }
        }


        if (results.length > 0) {
            results.forEach(({ date, snippet, source }) => {
                const item = document.createElement('div');
                item.classList.add('result-item');
                item.innerHTML = `📅 <strong>${date}</strong> — ${source === 'journal' ? '📓' : '📝'} ${snippet}`;

                item.addEventListener('click', () => {
                    const [year, month, day] = date.split('-').map(Number);
                    const parsedDate = new Date(year, month - 1, day); // Month is 0-indexed
                    selectDate(parsedDate);

                    searchResults.classList.remove('visible');
                    searchInput.value = '';
                });

                searchResults.appendChild(item);
            });
            searchResults.classList.add('visible');
        } else {
            const item = document.createElement('div');
            item.classList.add('result-item');
            item.textContent = 'No matches found.';
            searchResults.appendChild(item);
            searchResults.classList.add('visible');
        }
    });

    // Optional: hide dropdown if clicking outside
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && e.target !== searchInput) {
            searchResults.classList.remove('visible');
        }
    });

    window.addEventListener('DriveDataLoaded', (e) => {
        console.log("DriveDataLoaded", e.detail);
        console.log("userData", userData);
        userData = e.detail;
        // Save the merged data
        saveUserData().then(() => {
            renderCalendar();
            updateUI();
            // showSyncStatus('✓ Data imported');
        });
    });




    const CLIENT_ID = '196261644414-ubkdto51sfvvbh368q80pfe5cqf3k0ut.apps.googleusercontent.com'; // Replace with your real client ID
    const REDIRECT_URI = 'https://todoandjournal.com/oauth2callback'; // Replace with your hosted callback page
    let isLoggedIn = false;


    function checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            isLoggedIn = false;
            updateUI();
        } else {
            verifyToken(token);
        }
    }



    function verifyToken(token) {
        fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + token)
            .then(response => {
                if (!response.ok) {
                    localStorage.removeItem('authToken');
                    isLoggedIn = false;
                    updateAuthUI();
                } else {
                    isLoggedIn = true;
                    updateAuthUI();
                }
            })
            .catch(error => {
                console.error('Token verification error:', error);
                localStorage.removeItem('authToken');
                isLoggedIn = false;
                updateAuthUI();
            });
    }



    function handleAuth() {
        if (isLoggedIn) {
            localStorage.removeItem('authToken');
            isLoggedIn = false;
            showSyncStatus('Logged out');
            updateAuthUI();
        } else {
            getAuthToken().then(() => {
                showSyncStatus('Logged in');
                updateAuthUI();
                syncData();  // Optional: your app-specific logic
            }).catch(err => {
                console.error("Login failed", err);
                showSyncStatus("Login failed");
            });
        }
    }


    async function getAuthToken() {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        localStorage.setItem("pkce_verifier", codeVerifier);

        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "openid email profile");
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");

        window.location.href = authUrl.toString();
    }

    function generateCodeVerifier() {
        const array = new Uint32Array(56 / 2);
        window.crypto.getRandomValues(array);
        return Array.from(array, dec => ('0' + dec.toString(16)).slice(-2)).join('');
    }

    async function generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }




    // font select
    const fontSelector = document.getElementById('font-selector');
    const customFonts = ["HandwrittenFont", "handwriting2", "Tony", "chinese1", "MondaySans", "AvrileSans-ExtraLight", "Inter"]

    // Load saved font from chrome.storage.sync
    const savedFont = localStorage.getItem('dreamyFont') || 'default';
    fontSelector.value = savedFont;
    applyFont(savedFont);


    fontSelect = document.getElementById("font-selector");
    fontSelect.innerHTML = '';
    customFonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font;
        option.textContent = font;
        fontSelect.appendChild(option);
    });

    // On change, store new font and apply it
    fontSelector.addEventListener('change', () => {
        console.log("font change triggered");
        const selectedFont = fontSelector.value;
        localStorage.setItem('dreamyFont', selectedFont);
        applyFont(selectedFont);
    });


    function applyFont(fontValue) {
        let styleTag = document.getElementById('dynamic-font-style');

        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'dynamic-font-style';
            document.head.appendChild(styleTag);
        }

        if (fontValue === 'default') {
            styleTag.textContent = '';
        } else {
            styleTag.textContent = `
            body, input, textarea, button, select {
                font-family: ${fontValue} !important;
            }

            input::placeholder,
            textarea::placeholder {
                font-family: ${fontValue} !important;
            }
        `;
        }

        console.log("Font applied:", fontValue);
    }



    // opacity slider
    function updateOpacity(value) {
        const boxes = document.querySelectorAll(".todo-item");
        boxes.forEach(box => {
            box.style.opacity = value;
        });
    }

    // Call this after todo items are added
    // updateOpacity(opacitySlider.value / 100);

    // const slider = document.getElementById("opacitySlider");

    // slider.addEventListener("input", () => {
    //     const alpha = slider.value / 100;
    //     localStorage.setItem("todoAlpha", alpha); // save preference
    //     const boxes = document.querySelectorAll(".todo-item");
    //     boxes.forEach(box => {
    //         box.style.backgroundColor = `rgba(255, 255, 255, ${alpha})`;;
    //     });
    // });

    // function applyAlpha(alpha) {
    //     console.log(alpha);
    //     const boxes = () => document.querySelectorAll(".todo-item");
    //     boxes().forEach(el => {
    //         el.style.backgroundColor = `rgba(255,255,255,${alpha})`;
    //     });
    // }

    // console.log(savedAlpha);
    // applyAlpha(savedAlpha);





    // grouping by color


    // Enhanced sorting functions
    function sortTasksByColor(tasks) {
        const colorOrder = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#A66DD4', '#9E9E9E', 'none'];

        return tasks.sort((a, b) => {
            const colorA = a.color || 'none';
            const colorB = b.color || 'none';
            const indexA = colorOrder.indexOf(colorA);
            const indexB = colorOrder.indexOf(colorB);

            if (indexA !== indexB) {
                return indexA - indexB;
            }

            // Secondary sort by displayOrder
            if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
                return a.displayOrder - b.displayOrder;
            }
            if (a.displayOrder !== undefined && b.displayOrder === undefined) {
                return -1;
            }
            if (a.displayOrder === undefined && b.displayOrder !== undefined) {
                return 1;
            }

            return 0;
        });
    }

    function sortTasksAlphabetically(tasks) {
        return tasks.sort((a, b) => {
            const result = a.text.localeCompare(b.text);
            if (result !== 0) return result;

            // Secondary sort by displayOrder if text is same
            if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
                return a.displayOrder - b.displayOrder;
            }
            return 0;
        });
    }

    function sortTasksDefault(tasks) {
        return tasks.sort((a, b) => {
            // If both have displayOrder, use it
            if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
                return a.displayOrder - b.displayOrder;
            }
            // If only a has displayOrder, it comes first
            if (a.displayOrder !== undefined && b.displayOrder === undefined) {
                return -1;
            }
            // If only b has displayOrder, it comes first
            if (a.displayOrder === undefined && b.displayOrder !== undefined) {
                return 1;
            }
            // If neither has displayOrder, maintain original order
            return 0;
        });
    }

    // Apply sorting based on current sort mode
    function applySorting(tasks) {
        switch (currentTodoSort) {
            case 'color':
                return sortTasksByColor([...tasks]);
            case 'alphabetical':
                return sortTasksAlphabetically([...tasks]);
            default:
                return sortTasksDefault([...tasks]);
        }
    }

    // Enhanced version of your renderRollingTodoList function
    function renderRollingTodoList() {
        todoList.innerHTML = '';
        console.log("rendering todo list", selectedDate);
        const currentDateString = formatDateString(selectedDate);

        let taskCount = 0;
        const isToday = currentDateString === formatDateString(new Date());

        // Add smooth transition class
        // todoList.classList.add('updating');

        // Collect tasks using your existing logic
        const pastTasks = [];
        const futureTasks = [];
        const completedTasks = [];
        const todayTasks = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Your existing task collection logic
        Object.keys(userData).forEach(dateString => {
            const [year, month, day] = dateString.split('-').map(Number);
            const taskDate = new Date(year, month - 1, day);

            if (userData[dateString]?.todos) {
                userData[dateString].todos.forEach(todo => {
                    if (!todo.originalDate) {
                        todo.originalDate = dateString;
                    }
                    if (!todo.startDate) {
                        todo.startDate = todo.originalDate;
                    }
                    if (!todo.endDate) {
                        todo.endDate = todo.originalDate;
                    }

                    const [start_year, start_month, start_day] = todo.startDate.split('-').map(Number);
                    const [end_year, end_month, end_day] = todo.endDate.split('-').map(Number);
                    const startDate = new Date(start_year, start_month - 1, start_day);
                    const endDate = new Date(end_year, end_month - 1, end_day);

                    if (todo.completed) {
                        todo.originalDate = dateString;
                        completedTasks.push(todo);
                    } else {
                        if (!todo.completed && startDate <= today && endDate >= today) {
                            todo.originalDate = dateString;
                            todayTasks.push(todo);
                        } else if (startDate > today) {
                            todo.originalDate = dateString;
                            futureTasks.push(todo);
                        } else if (endDate < today) {
                            todo.originalDate = dateString;
                            pastTasks.push(todo);
                        }
                    }
                });
            }
        });

        // Determine rendering mode
        if (currentTodoView === 'color') {
            renderColorGroupedView(todayTasks, pastTasks, futureTasks, completedTasks, currentDateString, isToday);
        } else {
            renderStatusGroupedView(todayTasks, pastTasks, futureTasks, completedTasks, currentDateString, isToday);
        }

        // Remove transition class after animation
        // setTimeout(() => {
        //     todoList.classList.remove('updating');
        // }, 300);
    }

    // Status-grouped view (your original approach with enhanced sorting)
    function renderStatusGroupedView(todayTasks, pastTasks, futureTasks, completedTasks, currentDateString, isToday) {
        // Sort today's tasks and create container
        const sortedTodayTasks = applySorting(todayTasks);

        const todayContainer = document.createElement('div');
        todayContainer.classList.add('task-group', 'fade-in');
        todayContainer.dataset.groupType = 'today';

        if (sortedTodayTasks.length > 0) {
            const todayHeader = document.createElement('h3');
            todayHeader.textContent = "Today's Tasks";
            todayHeader.classList.add('today-header');
            todayContainer.appendChild(todayHeader);
        }

        const todayList = document.createElement('ul');
        todayList.classList.add('todo-sublist');
        todayList.dataset.listType = 'today';
        todayList.dataset.dateString = currentDateString;

        // Add your existing event listeners
        todayList.addEventListener('dragover', handleDragOver);
        todayList.addEventListener('dragenter', handleDragEnter);
        todayList.addEventListener('dragleave', handleDragLeave);
        todayList.addEventListener('drop', handleDrop);

        todayContainer.appendChild(todayList);
        todoList.appendChild(todayContainer);

        // Render sorted today's tasks
        sortedTodayTasks.forEach(todo => {
            const li = renderTodoItemForDragDrop(todo, false);
            // Add color indicator
            if (todo.color) {
                li.dataset.color = todo.color;
                // li.style.borderLeft = `4px solid ${todo.color}`;
            }
            li.classList.add('task-item-animated');
            todayList.appendChild(li);
        });

        // Render overdue tasks with sorting
        if (isToday && pastTasks.length > 0) {
            const sortedPastTasks = applySorting(pastTasks);

            const overdueContainer = document.createElement('div');
            overdueContainer.classList.add('task-group', 'fade-in');
            overdueContainer.dataset.groupType = 'overdue';

            const overdueHeader = document.createElement('h3');
            overdueHeader.textContent = 'Overdue';
            overdueHeader.classList.add('overdue-header');

            const overdueList = document.createElement('ul');
            overdueList.classList.add('todo-sublist');
            overdueList.dataset.listType = 'overdue';

            overdueContainer.appendChild(overdueHeader);
            overdueContainer.appendChild(overdueList);
            todoList.appendChild(overdueContainer);

            sortedPastTasks.forEach(todo => {
                const li = renderTodoItemForDragDrop(todo, true);
                if (todo.color) {
                    li.dataset.color = todo.color;
                    // li.style.borderLeft = `4px solid ${todo.color}`;
                }
                li.classList.add('task-item-animated');
                overdueList.appendChild(li);
            });
        }

        // Render future tasks with sorting
        if (isToday && futureTasks.length > 0) {
            const sortedFutureTasks = applySorting(futureTasks);

            const futureTasksContainer = document.createElement('div');
            futureTasksContainer.classList.add('task-group', 'fade-in');
            futureTasksContainer.dataset.groupType = 'futuretasks';

            const futureTasksHeader = document.createElement('h3');
            futureTasksHeader.textContent = 'Upcoming';
            futureTasksHeader.classList.add('futuretasks-header');

            const futureTasksList = document.createElement('ul');
            futureTasksList.classList.add('todo-sublist');
            futureTasksList.dataset.listType = 'futuretasks';

            futureTasksContainer.appendChild(futureTasksHeader);
            futureTasksContainer.appendChild(futureTasksList);
            todoList.appendChild(futureTasksContainer);

            sortedFutureTasks.forEach(todo => {
                const li = renderTodoItemForDragDrop(todo, true);
                if (todo.color) {
                    li.dataset.color = todo.color;
                    // li.style.borderLeft = `4px solid ${todo.color}`;
                }
                li.classList.add('task-item-animated');
                futureTasksList.appendChild(li);
            });
        }

        // Render completed tasks with sorting
        if (isToday && completedTasks.length > 0) {
            const sortedCompletedTasks = applySorting(completedTasks);

            const completedTasksContainer = document.createElement('div');
            completedTasksContainer.classList.add('task-group', 'fade-in');
            completedTasksContainer.dataset.groupType = 'completed';

            const completedTasksHeader = document.createElement('h3');
            completedTasksHeader.textContent = 'Completed';
            completedTasksHeader.classList.add('completed-header');

            const completedTasksList = document.createElement('ul');
            completedTasksList.classList.add('todo-sublist');
            completedTasksList.dataset.listType = 'completed';

            completedTasksContainer.appendChild(completedTasksHeader);
            completedTasksContainer.appendChild(completedTasksList);
            todoList.appendChild(completedTasksContainer);

            sortedCompletedTasks.forEach(todo => {
                const li = renderTodoItemForDragDrop(todo, true);
                if (todo.color) {
                    li.dataset.color = todo.color;
                    // li.style.borderLeft = `4px solid ${todo.color}`;
                }
                li.classList.add('task-item-animated');
                completedTasksList.appendChild(li);
            });
        }
    }

    // Color-grouped view (new functionality)
    function renderColorGroupedView(todayTasks, pastTasks, futureTasks, completedTasks, currentDateString, isToday) {
        // Combine all tasks
        const allTasks = [...todayTasks, ...pastTasks, ...futureTasks, ...completedTasks];

        // Group tasks by color
        const tasksByColor = {};
        allTasks.forEach(todo => {
            const color = todo.color || 'none';
            if (!tasksByColor[color]) {
                tasksByColor[color] = {
                    today: [],
                    overdue: [],
                    future: [],
                    completed: []
                };
            }

            // Categorize by status
            if (completedTasks.includes(todo)) {
                tasksByColor[color].completed.push(todo);
            } else if (todayTasks.includes(todo)) {
                tasksByColor[color].today.push(todo);
            } else if (futureTasks.includes(todo)) {
                tasksByColor[color].future.push(todo);
            } else if (pastTasks.includes(todo)) {
                tasksByColor[color].overdue.push(todo);
            }
        });

        // Render color groups
        const colorOrder = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#A66DD4', '#9E9E9E', 'none'];

        colorOrder.forEach(color => {
            if (tasksByColor[color]) {
                const colorGroup = tasksByColor[color];
                const totalTasks = colorGroup.today.length + colorGroup.overdue.length +
                    colorGroup.future.length + colorGroup.completed.length;

                if (totalTasks > 0) {
                    const container = document.createElement('div');
                    container.classList.add('color-group', 'fade-in');
                    container.dataset.groupType = 'color';
                    container.dataset.color = color;

                    const header = document.createElement('div');
                    header.className = `color-group-header ${TASK_COLORS[color].class}`;
                    header.innerHTML = `
                    ${TASK_COLORS[color].name}
                    <span class="task-count">${totalTasks}</span>
                `;

                    const content = document.createElement('div');
                    content.className = 'color-group-content';

                    // Add subgroups for each status
                    const statusGroups = [
                        { title: 'Today', tasks: colorGroup.today, listType: 'today' },
                        { title: 'Overdue', tasks: colorGroup.overdue, listType: 'overdue' },
                        { title: 'Future', tasks: colorGroup.future, listType: 'futuretasks' },
                        { title: 'Completed', tasks: colorGroup.completed, listType: 'completed' }
                    ];

                    statusGroups.forEach(group => {
                        if (group.tasks.length > 0) {
                            const subGroup = document.createElement('div');
                            subGroup.className = 'status-subgroup';

                            const subHeader = document.createElement('div');
                            subHeader.className = 'status-subgroup-header';
                            subHeader.textContent = `${group.title} (${group.tasks.length})`;

                            const subList = document.createElement('ul');
                            subList.className = 'todo-sublist status-subgroup-content';
                            subList.dataset.listType = group.listType;
                            if (group.listType === 'today') {
                                subList.dataset.dateString = currentDateString;
                                // Add drag/drop listeners only for today's tasks
                                subList.addEventListener('dragover', handleDragOver);
                                subList.addEventListener('dragenter', handleDragEnter);
                                subList.addEventListener('dragleave', handleDragLeave);
                                subList.addEventListener('drop', handleDrop);
                            }

                            const sortedTasks = applySorting(group.tasks);
                            sortedTasks.forEach(todo => {
                                const li = renderTodoItemForDragDrop(todo, group.listType !== 'today');
                                if (todo.color) {
                                    li.dataset.color = todo.color;
                                    // li.style.borderLeft = `4px solid ${todo.color}`;
                                }
                                li.classList.add('task-item-animated');
                                subList.appendChild(li);
                            });

                            subGroup.appendChild(subHeader);
                            subGroup.appendChild(subList);
                            content.appendChild(subGroup);
                        }
                    });

                    container.appendChild(header);
                    container.appendChild(content);
                    todoList.appendChild(container);
                }
            }
        });
    }

    // Initialize sorting controls (call this when your app starts)
    function initializeColorSorting() {
        // Create and add sorting controls to your existing UI
        const sortingControls = document.createElement('div');
        sortingControls.className = 'sorting-controls';
        sortingControls.innerHTML = `
        <label>Sort by:</label>
        <button class="sort-button active" data-sort="default"><i class="fas fa-clipboard-list"></i></button>
        <button class="sort-button" data-sort="color"><i class="fas fa-palette"></i></button>
        <button class="sort-button" data-sort="alphabetical"><i class="fas fa-sort-alpha-down"></i></button>
        <div class="view-mode-toggle">
            <button class="view-mode-btn active" data-mode="status"><i class="fas fa-clipboard-list"></i></button>
            <button class="view-mode-btn" data-mode="color"><i class="fas fa-palette"></i></button>
        </div>
    `;

        // Insert before your todo list
        // const todoSection = document.getElementById('todo-section');
        // const todoList = document.getElementById('todo-list');
        // todoSection.insertBefore(sortingControls, todoList);

        const todoHeaderSection = document.getElementById('todo-header-row');
        const headerEnd = document.getElementById("header-end");
        todoHeaderSection.insertBefore(sortingControls, headerEnd);

        // Add event listeners
        const sortButtons = document.querySelectorAll('.sort-button');
        const viewButtons = document.querySelectorAll('.view-mode-btn');

        sortButtons.forEach(button => {
            button.addEventListener('click', () => {
                sortButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentTodoSort = button.dataset.sort;
                renderRollingTodoList();
            });
        });

        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                viewButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                currentTodoView = button.dataset.mode;
                renderRollingTodoList();
            });
        });
    }

    initializeColorSorting();







});


// Add this to your existing app.js or create a new mobile.js file

// Mobile swipe functionality - only initializes on mobile devices
function initMobileSwipe() {
    // Only run on mobile devices
    if (window.innerWidth > 768) return;

    const container = document.querySelector('.container');
    const toolbar = document.querySelector('.toolbar');

    // Add mobile classes
    container.classList.add('mobile-swipe-container');

    // Create page indicator
    const indicator = document.createElement('div');
    indicator.className = 'mobile-page-indicator';
    indicator.innerHTML = `
        <div class="mobile-dot active" data-slide="0"></div>
        <div class="mobile-dot" data-slide="1"></div>
        <div class="mobile-dot" data-slide="2"></div>
    `;
    toolbar.appendChild(indicator);

    // Swipe state
    let currentSlide = 0;
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let isAnimating = false;
    const threshold = 50;

    // Get dots for navigation
    const dots = document.querySelectorAll('.mobile-dot');

    // Touch event handlers
    function handleTouchStart(e) {
        if (isAnimating) return;
        startX = e.touches[0].clientX;
        currentX = startX;
        isDragging = true;
        container.classList.add('no-transition');
        container.classList.add('dragging');
    }

    function handleTouchMove(e) {
        if (!isDragging) return;

        // Prevent default only for horizontal swipes
        const deltaX = Math.abs(e.touches[0].clientX - startX);
        const deltaY = Math.abs(e.touches[0].clientY - (e.touches[0].clientY || 0));

        if (deltaX > deltaY) {
            e.preventDefault();
        }

        currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        const translateX = -(currentSlide * 100) + (diff / window.innerWidth * 100);

        // Add resistance at boundaries
        let finalTranslateX = translateX;
        if (currentSlide === 0 && diff > 0) {
            finalTranslateX = diff / window.innerWidth * 30; // Resistance
        } else if (currentSlide === 2 && diff < 0) {
            finalTranslateX = -200 + (diff / window.innerWidth * 30); // Resistance
        }

        container.style.transform = `translateX(${finalTranslateX}vw)`;
    }

    function handleTouchEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        container.classList.remove('no-transition');
        container.classList.remove('dragging');

        const diff = currentX - startX;
        const absDiff = Math.abs(diff);

        if (absDiff > threshold) {
            if (diff > 0 && currentSlide > 0) {
                // Swipe right - go to previous slide
                goToSlide(currentSlide - 1);
            } else if (diff < 0 && currentSlide < 2) {
                // Swipe left - go to next slide
                goToSlide(currentSlide + 1);
            } else {
                // Snap back to current slide
                updateSlide(currentSlide);
            }
        } else {
            // Snap back to current slide
            updateSlide(currentSlide);
        }
    }

    function goToSlide(index) {
        if (index < 0 || index > 2 || index === currentSlide || isAnimating) {
            return;
        }
        currentSlide = index;
        updateSlide(index);
    }

    function updateSlide(index) {
        isAnimating = true;
        container.style.transform = `translateX(-${index * 100}vw)`;

        // Update dots
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        // Update view tabs state if they exist (for consistency with desktop)
        const viewTabs = document.querySelectorAll('.view-tab');
        viewTabs.forEach(tab => tab.classList.remove('active'));

        // Map slides to view tabs: 0=calendar, 1=journal, 2=todo
        const viewModes = ['calendar', 'journal', 'todo'];
        const activeTab = document.querySelector(`[data-view="${viewModes[index]}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Trigger any existing view change handlers
        if (window.switchView) {
            window.switchView(viewModes[index]);
        }

        // Reset animation flag
        setTimeout(() => {
            isAnimating = false;
        }, 300);
    }

    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Dot navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => goToSlide(index));
    });

    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            updateSlide(currentSlide);
        }, 100);
    });

    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.innerWidth > 768) {
                // Switched to desktop - remove mobile classes and reset
                container.classList.remove('mobile-swipe-container', 'no-transition', 'dragging');
                container.style.transform = '';
                indicator.remove();
            } else {
                updateSlide(currentSlide);
            }
        }, 100);
    });

    // Initialize with first slide
    updateSlide(0);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initMobileSwipe();
});

// Re-initialize on window resize (desktop to mobile)
window.addEventListener('resize', () => {
    if (window.innerWidth <= 768 && !document.querySelector('.mobile-page-indicator')) {
        initMobileSwipe();
    }
});




// let lastScrollTop = 0;
// const todoList = document.getElementById("todo-list");
// const todoHeader = document.querySelector(".todo-header");

// todoList.addEventListener("scroll", function () {
//     const st = todoList.scrollTop;

//     if (st <= 0) {
//         // At top
//         todoHeader.classList.remove("hidden");
//     } else if (st > lastScrollTop) {
//         // Scrolling down
//         todoHeader.classList.add("hidden");
//     } else {
//         // Scrolling up
//         todoHeader.classList.remove("hidden");
//     }

//     lastScrollTop = st <= 0 ? 0 : st;
// });