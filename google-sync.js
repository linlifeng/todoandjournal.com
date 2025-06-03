// Global variables
let isLoggedIn = false;
const syncStatusElement = document.getElementById('sync-indicator'); // Element to show sync status
const loginButton = document.getElementById('login-button'); // Assuming you have this element
const syncNowButton = document.getElementById('sync-now'); // Assuming you have this element
const restoreFromGoogleBtn = document.getElementById('modal-google-drive-import-btn'); // Assuming you have this element

// Constants
const SCOPES = [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/calendar.events'
];
const APP_DATA_FILENAME = 'todo_data.json';


function updateAuthUI() {
    if (loginButton) {
        loginButton.textContent = isLoggedIn ? 'Logout' : 'Login with Google';
    }
    if (syncNowButton) {
        syncNowButton.style.display = isLoggedIn ? 'inline-block' : 'none';
    }
    if (restoreFromGoogleBtn) {
        restoreFromGoogleBtn.style.display = isLoggedIn ? 'inline-block' : 'none';
    }
}


function logout() {
    chrome.identity.getAuthToken({ interactive: false }, function (token) {
        if (chrome.runtime.lastError || !token) {
            console.warn('No token to revoke or already logged out.');
        } else {
            chrome.identity.removeCachedAuthToken({ token }, function () {
                console.log('Token removed from cache');
                // Optionally revoke the token on Google's server
                fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
                    .then(() => console.log('Token revoked from server'))
                    .catch(err => console.error('Error revoking token:', err));
            });
        }

        isLoggedIn = false;
        updateAuthUI();
        showSyncStatus('Logged out');
    });
}






// Request auth token from Chrome
function getAuthToken(interactive) {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({
            interactive: interactive,
            scopes: SCOPES
        }, token => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(token);
            }
        });
    });
}

// Show sync status to user
function showSyncStatus(message) {
    if (syncStatusElement) {
        syncStatusElement.textContent = message;

        // Clear status message after 3 seconds if it's a success message
        if (message.includes('✓')) {
            setTimeout(() => {
                syncStatusElement.textContent = '';
            }, 3000);
        }
    }
}

// Main function to sync data
async function syncData() {
    try {
        // Get the current todo data from your extension's storage
        const todoData = await getTodoData();
        const fullUserData = await getFullUserData();
        // Sync data to Google Drive
        const driveSuccess = await saveToGoogleDrive(fullUserData);

        // Optionally, sync tasks to Google Calendar
        const calendarSuccess = await syncToGoogleCalendar(todoData);
        console.log("sent:", todoData, "calendar syncing successful", calendarSuccess);
        if (driveSuccess && calendarSuccess) {
            showSyncStatus('✓ All data synced');
        } else if (driveSuccess) {
            showSyncStatus('✓ Synced to Drive only');
        } else if (calendarSuccess) {
            showSyncStatus('✓ Synced to Calendar only');
        } else {
            showSyncStatus('Sync failed');
        }
    } catch (error) {
        console.error('Sync error:', error);
        showSyncStatus('Error syncing data');
    }
}

// Get todo data from extension storage
function getTodoData() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get('dreamyTabData', (result) => {
            // console.log("Retrieved data:", result);

            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                let allTodos = [];

                // Navigate through the proper structure
                if (result.dreamyTabData) {
                    // Get all date keys
                    const dateKeys = Object.keys(result.dreamyTabData);

                    // Collect todos from all dates
                    dateKeys.forEach(dateKey => {
                        if (result.dreamyTabData[dateKey] &&
                            result.dreamyTabData[dateKey].todos &&
                            Array.isArray(result.dreamyTabData[dateKey].todos)) {

                            // Add todos from this date to our collection
                            allTodos = allTodos.concat(result.dreamyTabData[dateKey].todos);
                        }
                    });
                }

                // console.log("Extracted todos from all dates:", allTodos);
                resolve(allTodos);
            }
        });
    });
}

function getFullUserData() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get('dreamyTabData', (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result.dreamyTabData || {});
            }
        });
    });
}


// Save data to Google Drive
async function saveToGoogleDrive(data) {
    try {
        showSyncStatus('Syncing to Drive...');
        const token = await getAuthToken(false);
        const fileId = await findOrCreateAppDataFile(token);

        // Update file content
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Failed to update file: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Drive sync error:', error);
        return false;
    }
}

// Find existing app data file or create a new one
async function findOrCreateAppDataFile(token) {
    try {
        // First, search for an existing file
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${APP_DATA_FILENAME}'&fields=files(id)`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const searchData = await searchResponse.json();

        // If file exists, return its ID
        if (searchData.files && searchData.files.length > 0) {
            return searchData.files[0].id;
        }

        // Otherwise, create a new file
        const createResponse = await fetch(
            'https://www.googleapis.com/drive/v3/files',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: APP_DATA_FILENAME,
                    parents: ['appDataFolder'],
                    mimeType: 'application/json'
                })
            }
        );

        const createData = await createResponse.json();

        if (!createData.id) {
            throw new Error('Failed to create file');
        }

        // Initialize the file with empty data
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${createData.id}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([])
        });

        return createData.id;
    } catch (error) {
        console.error('Error finding/creating app data file:', error);
        throw error;
    }
}

// Load data from Google Drive
async function loadFromGoogleDrive() {
    try {
        showSyncStatus('Loading from Drive...');
        const token = await getAuthToken(false);
        const fileId = await findOrCreateAppDataFile(token);

        // Get file content
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load file');
        }

        const data = await response.json();
        console.log("google drive response:", data);

        // Save to extension storage
        chrome.storage.sync.set({'dreamyTabData': data }, () => {
            showSyncStatus('✓ Loaded from Drive');
            const event = new CustomEvent('DriveDataLoaded', { detail: data });
            window.dispatchEvent(event);
        });


        // return data;
    } catch (error) {
        console.error('Load from Drive error:', error);
        showSyncStatus('Error loading data');
        return null;
    }
}

// Sync tasks to Google Calendar
async function syncToGoogleCalendar(todos) {
    console.log('syncToGoogleCalendar called with:', todos);
    console.log('Type of todos:', typeof todos);

    try {
        showSyncStatus('Syncing to Calendar...');
        const token = await getAuthToken(false);

        // Get existing calendar events to avoid duplicates
        const existingEvents = await getCalendarEvents(token);
        console.log("exiting events.", existingEvents);

        let syncedCount = 0;

        // Filter todos that have due dates and should be synced to calendar
        // const todosWithDueDate = todos.filter(todo => todo.dueDate && todo.syncToCalendar !== false);
        const todosWithDueDate = todos
            // .filter(todo => todo.id && todo.dueDate && todo.syncToCalendar !== false)
            .map(todo => ({
                ...todo,
                dueDate: todo.isMultiDay ? todo.endDate : todo.startDate
            }))
            .filter(todo => todo.dueDate && todo.syncToCalendar !== false);


        for (const todo of todosWithDueDate) {
            // Check if this todo already exists in the calendar by using a unique identifier
            // (This is why we should add a unique ID to each todo item in your app)
            const existingEvent = existingEvents.find(event =>
                event.description && event.description.includes(`TodoID: ${todo.id}`)
            );

            if (existingEvent) {
                // Update existing event if the todo has changed
                console.log("exiting event found.", existingEvent);
                if (hasEventChanged(existingEvent, todo)) {
                    await updateCalendarEvent(token, existingEvent.id, todo);
                    syncedCount++;
                }
            } else {
                // Create new event
                await createCalendarEvent(token, todo);
                syncedCount++;
            }
        }
        

        //////////////


        if (syncedCount > 0) {
            console.log(`✓ Synced ${syncedCount} tasks to Calendar`);

            showSyncStatus(`✓ Synced ${syncedCount} tasks to Calendar`);
        } else {
            console.log('No calendar updates needed');

            showSyncStatus('No calendar updates needed');
        }

        return true;
    } catch (error) {
        console.error('Calendar sync error:', error);
        showSyncStatus('Error syncing to Calendar');
        return false;
    }
}

// Get events from Google Calendar
async function getCalendarEvents(token) {
    try {
        // Get events from primary calendar that are related to our app
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 7); // Look back 7 days

        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 30); // Look ahead 30 days

        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
            `timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&` +
            `q=TodoID`, // Search term to find our app's events
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to get calendar events');
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error getting calendar events:', error);
        return [];
    }
}

// Check if a todo has changed compared to its calendar event
function hasEventChanged(event, todo) {
    return (
        event.summary !== todo.title ||
        new Date(event.start.dateTime).toISOString() !== new Date(todo.dueDate).toISOString() ||
        event.description !== `${todo.description || ''}\n\nTodoID: ${todo.id}`
    );
}

// Helper functions # this is redundant from app.js
function formatDateString(date) {
    // console.log("converting...", date, date.getDate());
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}
function formatDateStringPreserveLocal(dateStr) {
    // Expecting dateStr to be like "2025-05-10"
    const parts = dateStr.split('-');
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
}
function getNextDateString(dateStr) {
    const parts = dateStr.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2] + 1); // add 1 to the day
    return formatDateString(date);
}

// Create a new calendar event for a todo
async function createCalendarEvent(token, todo) {

    const startDate = formatDateStringPreserveLocal(todo.startDate);
    const endDate = formatDateStringPreserveLocal(todo.dueDate);
    // console.log("dueDate", new Date(todo.dueDate), "afterformat", startDate, "endate", endDate);

    const endDateFormatted = getNextDateString(todo.dueDate);

    // endDate.setHours(endDate.getHours() + 1); // Default to 1 hour duration


    const event = {
        summary: todo.text,
        description: `${todo.description || ''}\n\nTodoID: ${todo.id}`,
        start: {
            date: startDate
        },
        end: {
            date: endDateFormatted // Must be one day after start for all-day events
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 60 } // Reminder 1 hour before
            ]
        }
    };

    console.log(event);

    const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        }
    );

    console.log("google calendar response:", response);
    if (!response.ok) {
        throw new Error('Failed to create calendar event');
    }

    return response.json();
}


// Update an existing calendar event
async function updateCalendarEvent(token, eventId, todo) {
    const startDate = formatDateStringPreserveLocal(todo.startDate);
    const endDate = formatDateStringPreserveLocal(todo.dueDate);
    // console.log("dueDate", new Date(todo.dueDate), "afterformat", startDate, "endate", endDate);

    const endDateFormatted = getNextDateString(todo.dueDate);

    // endDate.setHours(endDate.getHours() + 1); // Default to 1 hour duration


    const event = {
        summary: todo.text,
        description: `${todo.description || ''}\n\nTodoID: ${todo.id}`,
        start: {
            date: startDate
        },
        end: {
            date: endDateFormatted // Must be one day after start for all-day events
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 60 } // Reminder 1 hour before
            ]
        }
    };

    const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        }
    );

    if (!response.ok) {
        throw new Error('Failed to update calendar event');
    }

    return response.json();
}

// Initialize the auth status check
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    console.log("loaded");
    // Set up event listeners
    // if (loginButton) {
    //     loginButton.addEventListener('click', handleAuth);
    // }

    // if (syncNowButton) {
    //     syncNowButton.addEventListener('click', syncData);
    // }
});