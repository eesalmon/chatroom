async function loadUserInfo() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const user = await response.json();
            document.getElementById('user-display').innerHTML = `Hi, ${user.username} (<a href="/api/logout">logout</a>) `;
        } else {
             window.location.href = '/auth/login';
        }
    } catch (e) {
        console.error(e);
    }
}

const form = document.getElementById('remove-email-form');
const msgBox = document.getElementById('auth-message');

if (window.setupFormValidation) {
    window.setupFormValidation(form);
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    msgBox.style.display = 'none';
    msgBox.className = 'auth-message';

    const password = document.getElementById('password').value;

    try {
        const formData = new FormData();
        formData.append('password', password);

        const res = await fetch('/api/user/unbind-email', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (data.success) {
            msgBox.innerText = data.message;
            msgBox.style.display = 'block';
            msgBox.classList.add('success');
            setTimeout(() => {
                window.location.href = '/user/settings';
            }, 5000);
        } else {
            msgBox.innerText = data.message;
            msgBox.style.display = 'block';
            msgBox.classList.add('error');
        }
    } catch (err) {
        msgBox.innerText = "network error";
        msgBox.style.display = 'block';
        msgBox.classList.add('error');
    }
});

loadUserInfo();