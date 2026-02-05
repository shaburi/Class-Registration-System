/**
 * Example: Registration with Capacity Check and Schedule Clash Detection
 * 
 * This example demonstrates how to register a student for a section
 * using the registration service with built-in capacity and schedule validation.
 */

const { registerForSection, getAvailableSections } = require('../services/registration.service');

async function exampleRegistration() {
    const studentId = 'student-uuid-here';
    const semester = 3;
    const programme = 'Computer Science';

    try {
        // 1. Get available sections for student's semester
        console.log('Fetching available sections...');
        const sections = await getAvailableSections(semester, programme);

        console.log(`Found ${sections.length} available sections`);
        sections.forEach(section => {
            console.log(`- ${section.code} ${section.name} (Section ${section.section_number})`);
            console.log(`  ${section.day} ${section.start_time}-${section.end_time}`);
            console.log(`  Available: ${section.available_seats}/${section.capacity} seats\n`);
        });

        // 2. Register for a section
        const sectionToRegister = sections[0]; // First available section

        if (!sectionToRegister) {
            console.log('No sections available');
            return;
        }

        console.log(`\nAttempting to register for ${sectionToRegister.code} Section ${sectionToRegister.section_number}...`);

        const result = await registerForSection(studentId, sectionToRegister.section_id);

        if (result.success) {
            console.log('✓ Registration successful!');
            console.log(`Registration ID: ${result.registration.id}`);
            console.log(`Type: ${result.registration.registration_type}`);
        }

    } catch (error) {
        console.error('✗ Registration failed:');
        console.error(`  Error: ${error.message}`);

        // Common errors:
        // - "Section is at full capacity"
        // - "Schedule clash detected: ..."
        // - "Student is already registered for this section"
        // - "Cannot register for section. Subject is for semester X, but student is in semester Y"
    }
}

/**
 * Example: Handling Capacity and Schedule Clash Errors
 */
async function exampleErrorHandling() {
    const studentId = 'student-uuid';
    const fullSectionId = 'full-section-uuid';

    try {
        await registerForSection(studentId, fullSectionId);
    } catch (error) {
        if (error.message.includes('full capacity')) {
            console.log('Section is full. Student should:');
            console.log('1. Try a different section');
            console.log('2. Submit a manual join request');

            // Create manual join request (see swap examples)
        } else if (error.message.includes('Schedule clash')) {
            console.log('Time conflict detected!');
            console.log(error.message);
            console.log('Student needs to choose a different time slot');
        } else {
            console.error('Unexpected error:', error.message);
        }
    }
}

/**
 * Example: Atomic Transaction Behavior
 * 
 * Registration uses atomic transactions - either everything succeeds or nothing happens.
 * This prevents race conditions when multiple students register simultaneously.
 */
async function exampleAtomicRegistration() {
    const student1 = 'student1-uuid';
    const student2 = 'student2-uuid';
    const sectionWithOneSpot = 'section-uuid'; // Has only 1 spot left

    // Simulate concurrent registrations
    const [result1, result2] = await Promise.allSettled([
        registerForSection(student1, sectionWithOneSpot),
        registerForSection(student2, sectionWithOneSpot)
    ]);

    // One will succeed, one will fail with "Section is at full capacity"
    console.log('Student 1:', result1.status);
    console.log('Student 2:', result2.status);

    // The database trigger ensures enrolled_count is accurate
    // No race condition or overbooking can occur
}

// Export examples
module.exports = {
    exampleRegistration,
    exampleErrorHandling,
    exampleAtomicRegistration
};
