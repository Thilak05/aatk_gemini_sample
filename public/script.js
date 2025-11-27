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
                    symptoms: selectedSymptoms
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
});
