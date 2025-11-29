document.addEventListener('DOMContentLoaded', () => {
    // Views
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');

    // Tabs
    const tabMobile = document.getElementById('tab-mobile');
    const tabQr = document.getElementById('tab-qr');
    const tabRegManual = document.getElementById('tab-reg-manual');
    const tabRegQr = document.getElementById('tab-reg-qr');

    // Sections
    const mobileLoginForm = document.getElementById('mobile-login-form');
    const qrLoginSection = document.getElementById('qr-login-section');
    const registerForm = document.getElementById('register-form');
    const qrRegisterSection = document.getElementById('qr-register-section');

    // Buttons
    const btnShowRegister = document.getElementById('btn-show-register');
    const btnBackLogin = document.getElementById('btn-back-login');
    const btnLoginMobile = document.getElementById('btn-login-mobile');

    // QR Scanners
    let html5QrCodeLogin = null;
    let html5QrCodeRegister = null;

    // --- Navigation Logic ---

    btnShowRegister.addEventListener('click', () => {
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
        stopScanners();
    });

    btnBackLogin.addEventListener('click', () => {
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
        stopScanners();
    });

    // --- Login Tabs ---

    tabMobile.addEventListener('click', () => {
        tabMobile.classList.add('active');
        tabQr.classList.remove('active');
        mobileLoginForm.classList.remove('hidden');
        qrLoginSection.classList.add('hidden');
        stopScanners();
    });

    tabQr.addEventListener('click', () => {
        tabQr.classList.add('active');
        tabMobile.classList.remove('active');
        mobileLoginForm.classList.add('hidden');
        qrLoginSection.classList.remove('hidden');
        startLoginScanner();
    });

    // --- Register Tabs ---

    tabRegManual.addEventListener('click', () => {
        tabRegManual.classList.add('active');
        tabRegQr.classList.remove('active');
        registerForm.classList.remove('hidden');
        qrRegisterSection.classList.add('hidden');
        stopScanners();
    });

    tabRegQr.addEventListener('click', () => {
        tabRegQr.classList.add('active');
        tabRegManual.classList.remove('active');
        registerForm.classList.add('hidden');
        qrRegisterSection.classList.remove('hidden');
        startRegisterScanner();
    });

    // --- Login Logic ---

    btnLoginMobile.addEventListener('click', async () => {
        const mobile = document.getElementById('login-mobile').value;
        if (!mobile) return alert("Please enter mobile number");
        await performLogin(mobile);
    });

    async function performLogin(mobile) {
        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('user_mobile', data.user.mobile);
                localStorage.setItem('user_name', data.user.name);
                window.location.href = 'index.html';
            } else {
                alert(data.error || "Login failed");
            }
        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    }

    // --- Registration Logic ---

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Calculate Age from DOB if needed
        const dob = document.getElementById('reg-dob').value;
        let age = 0;
        if (dob) {
            // Simple age calc from DD-MM-YYYY
            const parts = dob.split('-');
            if (parts.length === 3) {
                const birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
            }
        }

        const userData = {
            mobile: document.getElementById('reg-mobile').value,
            name: document.getElementById('reg-name').value,
            dob: dob,
            age: age,
            gender: document.getElementById('reg-gender').value,
            address: document.getElementById('reg-address').value,
            state: document.getElementById('reg-state').value,
            hidn: document.getElementById('reg-hidn').value,
            hid: document.getElementById('reg-hid').value
        };

        try {
            const res = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const data = await res.json();

            if (data.success) {
                alert("Registration successful! Please login.");
                btnBackLogin.click();
            } else {
                alert(data.error || "Registration failed");
            }
        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    });

    // --- QR Scanner Logic ---

    function stopScanners() {
        if (html5QrCodeLogin) {
            html5QrCodeLogin.stop().catch(err => console.log(err));
            html5QrCodeLogin = null;
        }
        if (html5QrCodeRegister) {
            html5QrCodeRegister.stop().catch(err => console.log(err));
            html5QrCodeRegister = null;
        }
    }

    function startLoginScanner() {
        html5QrCodeLogin = new Html5Qrcode("reader-login");
        html5QrCodeLogin.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: 250 },
            (decodedText, decodedResult) => {
                // Success
                console.log(`Scan result: ${decodedText}`);
                try {
                    const data = JSON.parse(decodedText);
                    if (data.mobile) {
                        stopScanners();
                        performLogin(data.mobile);
                    } else {
                        alert("Invalid QR: Mobile number not found");
                    }
                } catch (e) {
                    // Maybe it's just the mobile number directly?
                    if (/^\d{10}$/.test(decodedText)) {
                        stopScanners();
                        performLogin(decodedText);
                    } else {
                        alert("Invalid QR format");
                    }
                }
            },
            (errorMessage) => {
                // parse error, ignore
            }
        ).catch(err => console.log(err));
    }

    function startRegisterScanner() {
        html5QrCodeRegister = new Html5Qrcode("reader-register");
        html5QrCodeRegister.start(
            { facingMode: "environment" }, 
            { fps: 10, qrbox: 250 },
            (decodedText, decodedResult) => {
                console.log(`Scan result: ${decodedText}`);
                try {
                    const data = JSON.parse(decodedText);
                    // Fill form
                    document.getElementById('reg-mobile').value = data.mobile || '';
                    document.getElementById('reg-name').value = data.name || '';
                    document.getElementById('reg-dob').value = data.dob || ''; // Assuming dd-mm-yyyy
                    document.getElementById('reg-gender').value = data.gender || 'M';
                    document.getElementById('reg-address').value = data.address || '';
                    document.getElementById('reg-state').value = data["state name"] || '';
                    document.getElementById('reg-hidn').value = data.hidn || '';
                    document.getElementById('reg-hid').value = data.hid || '';

                    stopScanners();
                    // Switch to manual tab to show filled data
                    tabRegManual.click();
                    alert("QR Scanned! Please verify details and click Register.");

                } catch (e) {
                    alert("Invalid QR JSON format");
                }
            },
            (errorMessage) => {
                // parse error
            }
        ).catch(err => console.log(err));
    }
});
