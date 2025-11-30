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
});
