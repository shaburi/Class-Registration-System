/**
 * Example: Schedule Conflict Detection
 * 
 * Demonstrates how the system detects and prevents schedule clashes
 */

const { detectScheduleClash } = require('../services/registration.service');
const { getClient } = require('../database/connection');

/**
 * Example: Detecting Time Conflicts
 * 
 * The system prevents students from registering for sections that overlap
 * with their existing schedule.
 */
async function exampleConflictDetection() {
    const client = await getClient();

    try {
        const studentId = 'student-uuid';

        // Student's current schedule:
        // Monday 9:00-11:00 - CSC301 Data Structures
        // Wednesday 14:00-16:00 - MATH201 Statistics

        console.log('Current Schedule:');
        console.log('  Monday    09:00-11:00  CSC301 Data Structures');
        console.log('  Wednesday 14:00-16:00  MATH201 Statistics\n');

        // Test 1: Try to register for Monday 10:00-12:00 (CLASH)
        console.log('Test 1: Attempting to add Monday 10:00-12:00...');
        const clash1 = await detectScheduleClash(
            client,
            studentId,
            'monday',
            '10:00',
            '12:00'
        );

        if (clash1.hasClash) {
            console.log('  ✗ CLASH DETECTED!');
            console.log(`  ${clash1.details}\n`);
        } else {
            console.log('  ✓ No clash\n');
        }

        // Test 2: Try to register for Monday 11:00-13:00 (CLASH - touches end time)
        console.log('Test 2: Attempting to add Monday 11:00-13:00...');
        const clash2 = await detectScheduleClash(
            client,
            studentId,
            'monday',
            '11:00',
            '13:00'
        );

        if (clash2.hasClash) {
            console.log('  ✗ CLASH DETECTED!');
            console.log(`  ${clash2.details}`);
            console.log('  Note: Even touching the end time counts as a clash\n');
        }

        // Test 3: Try to register for Monday 11:30-13:30 (NO CLASH)
        console.log('Test 3: Attempting to add Monday 11:30-13:30...');
        const clash3 = await detectScheduleClash(
            client,
            studentId,
            'monday',
            '11:30',
            '13:30'
        );

        if (clash3.hasClash) {
            console.log('  ✗ CLASH DETECTED!');
            console.log(`  ${clash3.details}\n`);
        } else {
            console.log('  ✓ No clash - Can register!\n');
        }

        // Test 4: Different day (NO CLASH)
        console.log('Test 4: Attempting to add Tuesday 10:00-12:00...');
        const clash4 = await detectScheduleClash(
            client,
            studentId,
            'tuesday',
            '10:00',
            '12:00'
        );

        if (clash4.hasClash) {
            console.log('  ✗ CLASH DETECTED!');
            console.log(`  ${clash4.details}\n`);
        } else {
            console.log('  ✓ No clash - Different day is OK!\n');
        }

    } finally {
        client.release();
    }
}

/**
 * Example: Clash Detection During Registration
 * 
 * When a student tries to register, the system automatically checks for clashes
 */
async function exampleRegistrationWithClashCheck() {
    const { registerForSection } = require('../services/registration.service');

    const studentId = 'student-uuid';
    const conflictingSectionId = 'section-monday-10-12'; // Clashes with existing Monday 9-11

    try {
        await registerForSection(studentId, conflictingSectionId);
    } catch (error) {
        console.log('Registration blocked:');
        console.log(`  ${error.message}`);
        console.log('\nSchedule clash prevents registration.');
        console.log('Student must either:');
        console.log('  1. Choose a different section time');
        console.log('  2. Drop the conflicting class first');
    }
}

/**
 * Example: Clash Detection in Swap Requests
 * 
 * Swap requests also check for clashes BEFORE allowing the swap
 */
async function exampleSwapClashDetection() {
    const { createSwapRequest } = require('../services/swap.service');

    const studentA = {
        id: 'student-a-uuid',
        sectionId: 'section-a-uuid' // Monday 9-11
    };

    const studentB = {
        id: 'student-b-uuid',
        sectionId: 'section-b-uuid' // Monday 10-12 (would clash with A's other class)
    };

    // Student A has another class: Monday 11-13
    // If they swap into B's section (Monday 10-12), it would clash with Monday 11-13

    try {
        await createSwapRequest(
            studentA.id,
            studentA.sectionId,
            studentB.id,
            studentB.sectionId
        );
    } catch (error) {
        console.log('Swap request denied:');
        console.log(`  ${error.message}`);
        console.log('\nThe system detected that swapping would create a schedule conflict.');
        console.log('Both students\' schedules are checked before approving any swap.');
    }
}

/**
 * Example: Complex Clash Scenarios
 */
async function exampleComplexClashScenarios() {
    const client = await getClient();

    try {
        const studentId = 'student-uuid';

        console.log('Complex Clash Detection Scenarios:\n');

        // Scenario 1: Exact overlap
        console.log('1. New class COMPLETELY INSIDE existing class:');
        console.log('   Existing: 09:00-12:00');
        console.log('   New:      10:00-11:00');
        const clash1 = await detectScheduleClash(client, studentId, 'monday', '10:00', '11:00');
        console.log(`   Result: ${clash1.hasClash ? 'CLASH' : 'OK'}\n`);

        // Scenario 2: Partial overlap (start)
        console.log('2. New class STARTS BEFORE and OVERLAPS:');
        console.log('   Existing: 10:00-12:00');
        console.log('   New:      09:00-11:00');
        const clash2 = await detectScheduleClash(client, studentId, 'monday', '09:00', '11:00');
        console.log(`   Result: ${clash2.hasClash ? 'CLASH' : 'OK'}\n`);

        // Scenario 3: Partial overlap (end)
        console.log('3. New class ENDS AFTER and OVERLAPS:');
        console.log('   Existing: 09:00-11:00');
        console.log('   New:      10:00-13:00');
        const clash3 = await detectScheduleClash(client, studentId, 'monday', '10:00', '13:00');
        console.log(`   Result: ${clash3.hasClash ? 'CLASH' : 'OK'}\n`);

        // Scenario 4: Exact same time
        console.log('4. EXACT SAME TIME:');
        console.log('   Existing: 09:00-11:00');
        console.log('   New:      09:00-11:00');
        const clash4 = await detectScheduleClash(client, studentId, 'monday', '09:00', '11:00');
        console.log(`   Result: ${clash4.hasClash ? 'CLASH' : 'OK'}\n`);

        // Scenario 5: Back-to-back (NO CLASH)
        console.log('5. BACK-TO-BACK classes:');
        console.log('   Existing: 09:00-11:00');
        console.log('   New:      11:00-13:00');
        const clash5 = await detectScheduleClash(client, studentId, 'monday', '11:00', '13:00');
        console.log(`   Result: ${clash5.hasClash ? 'CLASH' : 'OK'}`);
        console.log('   Note: Classes that START when another ENDS do NOT clash\n');

    } finally {
        client.release();
    }
}

/**
 * Example: Audit Log for Clash Detection
 * 
 * All clash detections are logged in audit logs for security analysis
 */
async function exampleClashAuditLogging() {
    console.log('Clash Detection Audit Logging:');
    console.log('Every registration attempt is logged, including:');
    console.log('  - Who attempted to register');
    console.log('  - When they attempted');
    console.log('  - What section they tried');
    console.log('  - Whether it was blocked due to clash');
    console.log('  - Details of the conflicting class\n');

    console.log('Example audit log entry:');
    console.log('  user_id_hash: 5f4dcc3b5aa765d61d8327deb882cf99...');
    console.log('  action_type: REGISTER_SECTION');
    console.log('  resource_type: registration');
    console.log('  response_status: 400');
    console.log('  is_suspicious: false');
    console.log('  created_at: 2026-01-09 16:49:35\n');
}

// Export examples
module.exports = {
    exampleConflictDetection,
    exampleRegistrationWithClashCheck,
    exampleSwapClashDetection,
    exampleComplexClashScenarios,
    exampleClashAuditLogging
};
