document.addEventListener('DOMContentLoaded', () => {
    const vitalsSection = document.getElementById('vitals-section');
    const symptomsSection = document.getElementById('symptoms-section');
    const resultsSection = document.getElementById('results-section');
    
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const restartBtn = document.getElementById('restart-btn');
    
    const bodyParts = document.querySelectorAll('.body-part');
    
    let collectedVitals = {};

    // Navigation: Vitals -> Symptoms
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
        } else {
            form.reportValidity();
        }
    });

    // Toggle Body Part Symptoms
    bodyParts.forEach(part => {
        part.addEventListener('click', () => {
            const partName = part.getAttribute('data-part');
            const list = document.getElementById(`symptoms-${partName}`);
            list.classList.toggle('hidden');
        });
    });

    // Submit Data
    submitBtn.addEventListener('click', async () => {
        const selectedSymptoms = [];
        
        // Get checkboxes
        document.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            selectedSymptoms.push(cb.value);
        });

        // Get skin symptoms
        const skinSelect = document.getElementById('skin-symptoms');
        for (let option of skinSelect.selectedOptions) {
            selectedSymptoms.push(option.value);
        }

        if (selectedSymptoms.length === 0) {
            alert("Please select at least one symptom.");
            return;
        }

        symptomsSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('output').textContent = "";

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
            
            if (data.result) {
                document.getElementById('output').textContent = data.result;
            } else {
                document.getElementById('output').textContent = "Error: " + (data.error || "Unknown error");
            }

        } catch (error) {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('output').textContent = "Error connecting to server.";
            console.error(error);
        }
    });

    // Restart
    restartBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        vitalsSection.classList.remove('hidden');
        document.getElementById('vitals-form').reset();
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    });
});
