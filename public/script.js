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

    // --- History Modal Logic ---
    const historyBtn = document.getElementById('history-btn');
    const historyModal = document.getElementById('history-modal');
    const closeHistoryBtn = document.getElementById('close-history');
    const historyList = document.getElementById('history-list');
    const userDetailsCard = document.getElementById('user-details-card');

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    historyBtn.addEventListener('click', async () => {
        try {
            const response = await fetch(`/history/${userMobile}`);
            if (!response.ok) throw new Error('Failed to fetch history');
            
            const data = await response.json();
            const user = data.user;
            const history = data.history;
            
            // Populate User Details
            if (user) {
                const genderDisplay = user.gender === 'M' ? 'Male' : (user.gender === 'F' ? 'Female' : 'Other');
                userDetailsCard.innerHTML = `
                    <p><strong>Name:</strong> ${user.name}</p>
                    <p><strong>Mobile:</strong> ${user.mobile}</p>
                    <p><strong>Age:</strong> ${user.age}</p>
                    <p><strong>Gender:</strong> ${genderDisplay}</p>
                `;
            }

            // Populate History List
            historyList.innerHTML = '';
            if (!history || history.length === 0) {
                historyList.innerHTML = '<p class="text-muted">No past analyses found.</p>';
            } else {
                history.forEach(item => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';
                    
                    // Parse symptoms if it's a JSON string, otherwise display as is
                    let symptomsDisplay = item.symptoms;
                    try {
                        const symptomsObj = JSON.parse(item.symptoms);
                        if (Array.isArray(symptomsObj)) {
                            symptomsDisplay = symptomsObj.join(', ');
                        } else if (typeof symptomsObj === 'object') {
                             // Handle if it's stored as { "Head": ["Headache"] } etc.
                             symptomsDisplay = Object.values(symptomsObj).flat().join(', ');
                        }
                    } catch (e) {
                        // Not JSON, keep as string
                    }

                    historyItem.innerHTML = `
                        <span class="history-date"><i class="fa-regular fa-calendar"></i> ${formatDate(item.created_at)}</span>
                        <span class="history-symptoms">Symptoms: ${symptomsDisplay}</span>
                        <div class="history-diagnosis">${marked.parse(item.response_text || '')}</div>
                    `;
                    historyList.appendChild(historyItem);
                });
            }

            historyModal.classList.remove('hidden');
            // Small delay to allow display:flex to apply before opacity transition
            setTimeout(() => historyModal.classList.add('show'), 10);

        } catch (error) {
            console.error('Error fetching history:', error);
            alert('Could not load history. Please try again.');
        }
    });

    function closeHistory() {
        historyModal.classList.remove('show');
        setTimeout(() => historyModal.classList.add('hidden'), 300); // Wait for transition
    }

    closeHistoryBtn.addEventListener('click', closeHistory);

    // Close on click outside
    window.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            closeHistory();
        }
    });
});
