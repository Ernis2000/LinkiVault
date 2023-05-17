window.onload = async function() {
    // Fetch account creation date from the server
    const response = await fetch('/getAccountCreationDate', {method: 'GET'});
    if (response.ok) {
        const data = await response.json();

        // Display account creation date
        const accountCreationDateDiv = document.getElementById('accountCreationDate');
        accountCreationDateDiv.textContent = `Account created on: ${new Date(data.accountCreationDate).toLocaleDateString()}`;
    } else {
        console.error('Error fetching account creation date:', response.status, response.statusText);
    }
};

document.getElementById('changePasswordForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword !== confirmNewPassword) {
        showAlert("New passwords do not match");
        return;
    }

    const response = await fetch('/changePassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
    });

    if (response.status === 200) {
        showAlert('Password changed successfully!');
    } else {
        const errorMessage = await response.text();
        showAlert(errorMessage);
    }
});

document.getElementById('deleteAccountButton').addEventListener('click', function() {
    document.getElementById('confirmation').style.display = 'block';
});

let currentPassword = null;

document.getElementById('confirmAccountDeletionYes').addEventListener('click', function() {
    document.getElementById('confirmation').style.display = 'none'; // Hide confirmation modal
    document.getElementById('passwordConfirmation').style.display = 'block'; // Show password confirmation modal
});

document.getElementById('confirmPasswordYes').addEventListener('click', async function() {
    document.getElementById('passwordConfirmation').style.display = 'none'; // Hide password confirmation modal

    currentPassword = document.getElementById('passwordInput').value;
    document.getElementById('passwordInput').value = "";
    if (!currentPassword) {
        return;
    }

    const response = await fetch('/deleteAccount', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: currentPassword })
    });

    if (response.status === 200) {
        showAlert('Account deleted successfully!');
        window.location.href = '/login';  // Redirect to login page
    } else {
        const errorMessage = await response.text();
        showAlert(errorMessage);
    }
});

document.getElementById('confirmPasswordNo').addEventListener('click', function() {
    document.getElementById('passwordConfirmation').style.display = 'none'; // Hide password confirmation modal
});

document.getElementById('confirmAccountDeletionNo').addEventListener('click', function() {
    document.getElementById('confirmation').style.display = 'none'; // Hide confirmation modal
});

document.getElementById('alertOkButton').addEventListener('click', hideAlert);

function showAlert(message) {
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('customAlert').style.display = 'block';
}

function hideAlert() {
    document.getElementById('customAlert').style.display = 'none';
}



