document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const vitalsSection = document.getElementById('vitals-section');
    const symptomsSection = document.getElementById('symptoms-section');
    const resultsSection = document.getElementById('results-section');
    
    const nextBtn = document.getElementById('next-btn');
    const backBtn = document.getElementById('back-btn');
    const submitBtn = document.getElementById('submit-btn');
    const restartBtn = document.getElementById('restart-btn');
    
    const step1Indicator = document.getElementById('step-1-indicator');
    const step2Indicator = document.getElementById('step-2-indicator');
    const step3Indicator = document.getElementById('step-3-indicator');

    const bodyPartItems = document.querySelectorAll('.body-part-item');
    const symptomGroups = document.querySelectorAll('.symptom-group');

    // Check Authentication
    const userMobile = localStorage.getItem('user_mobile');
    if (!userMobile) {
        window.location.href = 'login.html';
        return;
    }

    // Logout Logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user_mobile');
            window.location.href = 'login.html';
        });
    }

    // Fetch and Display User Data
    async function loadUserData() {
        try {
            const response = await fetch(`/user/${userMobile}`);
            if (response.ok) {
                const user = await response.json();
                
                // Update Header
                document.getElementById('display-name').textContent = user.name;
                document.getElementById('user-display').classList.remove('hidden');

                // Pre-fill Form
                if (user.age) {
                    document.getElementById('age').value = user.age;
                    // Optional: Make it readonly if you don't want them to change it
                    // document.getElementById('age').readOnly = true;
                }
                
                if (user.gender) {
                    let genderValue = user.gender;
                    // Map DB values (M, F, O) to Select values (Male, Female, Other)
                    if (genderValue === 'M') genderValue = 'Male';
                    else if (genderValue === 'F') genderValue = 'Female';
                    else if (genderValue === 'O') genderValue = 'Other';
                    
                    const genderSelect = document.getElementById('gender');
                    // Check if the value exists in options before setting
                    if ([...genderSelect.options].some(o => o.value === genderValue)) {
                        genderSelect.value = genderValue;
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load user data", error);
        }
    }

    loadUserData();

    let collectedVitals = {};
    let currentDataId = null;
    let currentSymptoms = [];

    // --- Navigation Logic ---

    function updateProgress(step) {
        // Reset all
        [step1Indicator, step2Indicator, step3Indicator].forEach(el => el.classList.remove('active'));
        
        if (step >= 1) step1Indicator.classList.add('active');
        if (step >= 2) step2Indicator.classList.add('active');
        if (step >= 3) step3Indicator.classList.add('active');
    }

    // Step 1 -> Step 2
    nextBtn.addEventListener('click', () => {
        const form = document.getElementById('vitals-form');
        if (form.checkValidity()) {
            collectedVitals = {
                height: document.getElementById('height').value,
                gender: document.getElementById('gender').value,
                age: document.getElementById('age').value,
                weight: document.getElementById('weight').value,
                temperature: document.getElementById('temperature').value,
                spo2: document.getElementById('spo2').value,
                heartrate: document.getElementById('heartrate').value
            };
            
            vitalsSection.classList.add('hidden');
            symptomsSection.classList.remove('hidden');
            updateProgress(2);
            window.scrollTo(0, 0);
        } else {
            form.reportValidity();
        }
    });

    // Step 2 -> Step 1
    backBtn.addEventListener('click', () => {
        symptomsSection.classList.add('hidden');
        vitalsSection.classList.remove('hidden');
        updateProgress(1);
    });

    // --- Symptom Selection Logic ---

    // Handle Body Part Switching
    bodyPartItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            bodyPartItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            // Hide all symptom groups
            symptomGroups.forEach(group => group.classList.remove('active'));
            
            // Show target group
            const targetId = item.getAttribute('data-target');
            document.getElementById(`group-${targetId}`).classList.add('active');
        });
    });

    // Highlight selected checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const card = e.target.closest('.checkbox-card');
            if (e.target.checked) {
                card.style.borderColor = 'var(--primary-color)';
                card.style.backgroundColor = '#eff6ff';
            } else {
                card.style.borderColor = 'var(--border-color)';
                card.style.backgroundColor = 'transparent';
            }
        });
    });

    // --- Submission Logic ---

    submitBtn.addEventListener('click', async () => {
        const selectedSymptoms = [];
        
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            selectedSymptoms.push(cb.value);
        });

        if (selectedSymptoms.length === 0) {
            alert("Please select at least one symptom.");
            return;
        }
        currentSymptoms = selectedSymptoms;

        // Move to results
        symptomsSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        updateProgress(3);
        
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('result-card').classList.add('hidden');
        document.getElementById('output').innerHTML = "";

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    vitals: collectedVitals,
                    symptoms: selectedSymptoms,
                    user_mobile: userMobile
                })
            });

            const data = await response.json();
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('result-card').classList.remove('hidden');
            
            if (data.result) {
                currentDataId = data.dataId;
                // Simple markdown to HTML conversion for better display
                let formattedResult = data.result
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                    .replace(/\n/g, '<br>'); // Newlines
                
                document.getElementById('output').innerHTML = formattedResult;
            } else {
                document.getElementById('output').textContent = "Error: " + (data.error || "Unknown error");
            }

        } catch (error) {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('result-card').classList.remove('hidden');
            document.getElementById('output').textContent = "Error connecting to server. Please try again.";
            console.error(error);
        }
    });

    // Restart
    restartBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        vitalsSection.classList.remove('hidden');
        updateProgress(1);
        
        // Reset forms
        document.getElementById('vitals-form').reset();
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            cb.closest('.checkbox-card').style.borderColor = 'var(--border-color)';
            cb.closest('.checkbox-card').style.backgroundColor = 'transparent';
        });
        
        // Reset view to first tab
        bodyPartItems[0].click();
    });

    // --- Profile Modal Logic ---
    const profileBtn = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileBtn = document.getElementById('close-profile');
    const historyList = document.getElementById('history-list');
    const userDetailsCard = document.getElementById('user-details-card');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');

    let currentUserData = null;
    let currentHistoryData = [];

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    profileBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`/history/${userMobile}`);
            if (!response.ok) throw new Error('Failed to fetch history');
            
            const data = await response.json();
            currentUserData = data.user;
            currentHistoryData = data.history || [];
            
            // Populate User Details
            if (currentUserData) {
                const genderDisplay = currentUserData.gender === 'M' ? 'Male' : (currentUserData.gender === 'F' ? 'Female' : 'Other');
                userDetailsCard.innerHTML = `
                    <p><strong>Name:</strong> ${currentUserData.name}</p>
                    <p><strong>Mobile:</strong> ${currentUserData.mobile}</p>
                    <p><strong>Age:</strong> ${currentUserData.age}</p>
                    <p><strong>Gender:</strong> ${genderDisplay}</p>
                `;
            }

            // Populate History List
            historyList.innerHTML = '';
            if (currentHistoryData.length === 0) {
                historyList.innerHTML = '<p class="text-muted">No past analyses found.</p>';
                downloadPdfBtn.disabled = true;
                downloadPdfBtn.style.opacity = '0.5';
            } else {
                downloadPdfBtn.disabled = false;
                downloadPdfBtn.style.opacity = '1';
                
                currentHistoryData.forEach(item => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    
                    // Parse symptoms
                    let symptomsDisplay = item.symptoms;
                    try {
                        const symptomsObj = JSON.parse(item.symptoms);
                        if (Array.isArray(symptomsObj)) {
                            symptomsDisplay = symptomsObj.join(', ');
                        } else if (typeof symptomsObj === 'object') {
                             symptomsDisplay = Object.values(symptomsObj).flat().join(', ');
                        }
                    } catch (e) {}

                    historyItem.innerHTML = `
                        <span class="history-date"><i class="fa-regular fa-calendar"></i> ${formatDate(item.created_at)}</span>
                        <span class="history-symptoms">Symptoms: ${symptomsDisplay}</span>
                        <div class="history-diagnosis">${marked.parse(item.response_text || '')}</div>
                        ${item.doctor_notes || item.prescription ? `
                            <div class="doctor-feedback" style="margin-top: 15px; padding: 15px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
                                <h4 style="margin: 0 0 10px 0; color: #0369a1; display: flex; align-items: center; gap: 8px;">
                                    <i class="fa-solid fa-user-doctor"></i> Doctor's Report ${item.doctor_name ? `(Dr. ${item.doctor_name})` : ''}
                                </h4>
                                ${item.doctor_notes ? `<p><strong>Notes:</strong> ${item.doctor_notes}</p>` : ''}
                                ${item.prescription ? `<p><strong>Prescription:</strong> ${item.prescription}</p>` : ''}
                            </div>
                        ` : ''}
                    `;
                    historyList.appendChild(historyItem);
                });
            }

            profileModal.classList.remove('hidden');
            setTimeout(() => profileModal.classList.add('show'), 10);

        } catch (error) {
            console.error('Error fetching profile:', error);
            alert('Could not load profile. Please try again.');
        }
    });

    // PDF Generation
    downloadPdfBtn.addEventListener('click', () => {
        if (!currentUserData) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(37, 99, 235); // Primary Color
        doc.text("AI Health - Patient Report", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        // User Details Section
        doc.setDrawColor(200);
        doc.line(14, 35, 196, 35);
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Patient Details", 14, 45);
        
        doc.setFontSize(11);
        doc.text(`Name: ${currentUserData.name}`, 14, 55);
        doc.text(`Mobile: ${currentUserData.mobile}`, 14, 62);
        doc.text(`Age: ${currentUserData.age}`, 100, 55);
        const genderDisplay = currentUserData.gender === 'M' ? 'Male' : (currentUserData.gender === 'F' ? 'Female' : 'Other');
        doc.text(`Gender: ${genderDisplay}`, 100, 62);

        // History Table
        doc.setFontSize(14);
        doc.text("Medical History", 14, 75);

        const tableData = currentHistoryData.map(item => {
            let symptomsDisplay = item.symptoms;
            try {
                const symptomsObj = JSON.parse(item.symptoms);
                if (Array.isArray(symptomsObj)) {
                    symptomsDisplay = symptomsObj.join(', ');
                } else if (typeof symptomsObj === 'object') {
                        symptomsDisplay = Object.values(symptomsObj).flat().join(', ');
                }
            } catch (e) {}

            // Clean up markdown for PDF (basic cleanup)
            let diagnosis = item.response_text || '';
            diagnosis = diagnosis.replace(/\*\*/g, '').replace(/\*/g, '-').replace(/#/g, '');

            // Format Vitals
            const vitals = [
                `Temp: ${item.temperature}°F`,
                `HR: ${item.heartrate} bpm`,
                `SpO2: ${item.spo2}%`,
                `Wt: ${item.weight} kg`
            ].join('\n');

            return [
                formatDate(item.created_at),
                vitals,
                symptomsDisplay,
                diagnosis
            ];
        });

        doc.autoTable({
            startY: 80,
            head: [['Date', 'Vitals', 'Symptoms', 'AI Diagnosis']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 30 },
                2: { cellWidth: 40 },
                3: { cellWidth: 'auto' }
            }
        });

        doc.save(`${currentUserData.name}_Health_Report.pdf`);
    });

    function closeProfile() {
        profileModal.classList.remove('show');
        setTimeout(() => profileModal.classList.add('hidden'), 300);
    }

    closeProfileBtn.addEventListener('click', closeProfile);

    window.addEventListener('click', (e) => {
        if (e.target === profileModal) {
            closeProfile();
        }
    });

    // --- Doctor Consultation Logic ---
    const consultBtn = document.getElementById('consult-btn');
    const videoModal = document.getElementById('video-modal');
    const closeVideoBtn = document.getElementById('close-video');
    const waitingScreen = document.getElementById('waiting-screen');
    const patientControls = document.getElementById('patient-controls');
    const endCallBtn = document.getElementById('end-call-btn');
    
    let socket = null;
    let peerConnection = null;
    let currentDoctorSocket = null;
    let iceCandidateQueue = [];

    consultBtn.addEventListener('click', async () => {
        // Initialize Socket
        if (!socket) socket = io();

        videoModal.classList.add('show');
        waitingScreen.classList.remove('hidden');
        patientControls.classList.add('hidden');
        
        // Send Request
        const userMobile = localStorage.getItem('user_mobile');
        const userName = localStorage.getItem('user_name') || document.getElementById('display-name').textContent;
        
        try {
            // 1. Create DB Record
            const res = await fetch('/consult/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_mobile: userMobile, data_id: currentDataId })
            });
            
            const data = await res.json();
            
            if (data.success) {
                // 2. Emit Socket Event
                socket.emit('patient_request', {
                    user_mobile: userMobile,
                    patientName: userName,
                    symptoms: currentSymptoms.join(', '),
                    consultationId: data.consultationId,
                    vitals: collectedVitals,
                    age: document.getElementById('age').value,
                    gender: document.getElementById('gender').value
                });
            } else {
                alert('Failed to initiate request. Please try again.');
                closeVideo();
            }
        } catch (e) {
            console.error(e);
            alert('Connection error.');
            closeVideo();
        }

        // Listen for responses
        socket.on('no_doctors_available', () => {
            waitingScreen.innerHTML = `
                <i class="fa-solid fa-user-doctor-slash fa-3x" style="color: #ef4444; margin-bottom: 20px;"></i>
                <h3>No Doctors Available</h3>
                <p>We have sent your report to our admin team. A doctor will contact you shortly.</p>
                <button onclick="closeVideo()" class="control-btn" style="margin-top: 20px; width: auto; padding: 0 20px; border-radius: 8px;">Close</button>
            `;
            
            // Trigger Email to Admin
            fetch('/consult/email-admin', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    patientDetails: { name: userName, mobile: userMobile },
                    report: document.getElementById('output').innerText
                })
            });
        });

        socket.on('request_accepted', (data) => {
            currentDoctorSocket = data.doctorSocketId;
            startPatientCall();
        });

        // WebRTC Handlers
        socket.on('answer', async (data) => {
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                
                // Process queued candidates
                while (iceCandidateQueue.length > 0) {
                    const candidate = iceCandidateQueue.shift();
                    try {
                        await peerConnection.addIceCandidate(candidate);
                    } catch (e) { console.error("Error adding queued candidate", e); }
                }

                waitingScreen.classList.add('hidden');
                patientControls.classList.remove('hidden');
            }
        });

        socket.on('candidate', async (data) => {
            if (peerConnection) {
                const candidate = new RTCIceCandidate(data.candidate);
                if (peerConnection.remoteDescription) {
                    try {
                        await peerConnection.addIceCandidate(candidate);
                    } catch (e) { console.error("Error adding candidate", e); }
                } else {
                    iceCandidateQueue.push(candidate);
                }
            }
        });

        socket.on('consultation_completed', (data) => {
            closeVideo();
            
            // Show Completion Modal or Update UI
            const resultCard = document.getElementById('result-card');
            const output = document.getElementById('output');
            
            let completionHtml = `
                <div style="margin-top: 20px; padding: 20px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">
                    <h3 style="color: #166534; margin-top: 0;"><i class="fa-solid fa-user-doctor"></i> Doctor's Diagnosis</h3>
                    <p><strong>Notes:</strong> ${data.notes || 'No notes provided.'}</p>
                    <p><strong>Prescription:</strong> ${data.prescription || 'No prescription provided.'}</p>
                </div>
            `;
            
            // Append to existing AI output or replace
            output.innerHTML += completionHtml;
            resultCard.classList.remove('hidden');
            
            // Scroll to result
            resultCard.scrollIntoView({ behavior: 'smooth' });
            
            alert('Consultation completed. The doctor has updated your report.');
        });
    });

    async function startPatientCall() {
        // HTTPS Check
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            alert("Video calls require HTTPS. Please reload this page with https://");
            return;
        }

        const localVideo = document.getElementById('patient-local-video');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = stream;

        const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        peerConnection = new RTCPeerConnection(configuration);
        iceCandidateQueue = []; // Reset queue

        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

        peerConnection.ontrack = (event) => {
            document.getElementById('patient-remote-video').srcObject = event.streams[0];
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', { target: currentDoctorSocket, candidate: event.candidate });
            }
        };

        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', { target: currentDoctorSocket, sdp: offer });
    }

    window.togglePatientMute = function() {
        const localVideo = document.getElementById('patient-local-video');
        if (localVideo.srcObject) {
            const audioTrack = localVideo.srcObject.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const btn = document.querySelector('button[onclick="togglePatientMute()"]');
                btn.innerHTML = audioTrack.enabled ? '<i class="fa-solid fa-microphone"></i>' : '<i class="fa-solid fa-microphone-slash"></i>';
                btn.classList.toggle('danger', !audioTrack.enabled);
            }
        }
    };

    window.togglePatientVideo = function() {
        const localVideo = document.getElementById('patient-local-video');
        if (localVideo.srcObject) {
            const videoTrack = localVideo.srcObject.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                const btn = document.querySelector('button[onclick="togglePatientVideo()"]');
                btn.innerHTML = videoTrack.enabled ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-video-slash"></i>';
                btn.classList.toggle('danger', !videoTrack.enabled);
            }
        }
    };

    function closeVideo() {
        videoModal.classList.remove('show');
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        const localVideo = document.getElementById('patient-local-video');
        if (localVideo.srcObject) {
            localVideo.srcObject.getTracks().forEach(track => track.stop());
            localVideo.srcObject = null;
        }
    }

    closeVideoBtn.addEventListener('click', closeVideo);
    endCallBtn.addEventListener('click', closeVideo);
});
