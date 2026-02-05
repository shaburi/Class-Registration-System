/**
 * Example: Swap Request Creation and Approval Flow
 * 
 * This example demonstrates the complete swap request workflow
 * between two students.
 */

const {
    createSwapRequest,
    respondToSwapRequest,
    getSwapRequests
} = require('../services/swap.service');

/**
 * Scenario: Student A and Student B want to swap sections
 * - Student A is in Section A of CSC301 (Monday 9-11am)
 * - Student B is in Section B of CSC301 (Wednesday 2-4pm)
 * - They want to exchange sections
 */
async function exampleSwapRequestFlow() {
    const studentA = {
        id: 'student-a-uuid',
        sectionId: 'section-a-uuid'
    };

    const studentB = {
        id: 'student-b-uuid',
        sectionId: 'section-b-uuid'
    };

    try {
        // Step 1: Student A creates swap request
        console.log('Step 1: Student A creates swap request...');
        const swapRequest = await createSwapRequest(
            studentA.id,           // Requester
            studentA.sectionId,    // Requester's current section
            studentB.id,           // Target student
            studentB.sectionId     // Target's section (what requester wants)
        );

        if (swapRequest.success) {
            console.log('✓ Swap request created successfully');
            console.log(`  Request ID: ${swapRequest.swapRequest.id}`);
            console.log(`  Status: ${swapRequest.swapRequest.status}`);

            // Step 2: Student B receives notification and views the request
            console.log('\nStep 2: Student B views pending swap requests...');
            const pendingRequests = await getSwapRequests(studentB.id, 'pending');

            console.log(`Student B has ${pendingRequests.length} pending swap request(s)`);
            pendingRequests.forEach(req => {
                console.log(`\n  From: ${req.requester_name}`);
                console.log(`  They want: ${req.target_subject_code} Section ${req.target_section_number}`);
                console.log(`  You give: ${req.requester_subject_code} Section ${req.requester_section_number}`);
            });

            // Step 3: Student B accepts the swap
            console.log('\nStep 3: Student B accepts the swap request...');
            const response = await respondToSwapRequest(
                swapRequest.swapRequest.id,
                studentB.id,
                true, // Accept
                'Perfect! This fits my schedule better'
            );

            if (response.success && response.status === 'approved') {
                console.log('✓ Swap approved and executed!');
                console.log('  Sections have been automatically swapped');
                console.log('  Student A is now in Section B');
                console.log('  Student B is now in Section A');
            }
        }

    } catch (error) {
        console.error('✗ Swap request failed:');
        console.error(`  Error: ${error.message}`);

        // Common errors:
        // - "A pending swap request already exists between these students"
        // - "Requester would have schedule clash: ..."
        // - "Target student would have schedule clash: ..."
        // - "Swap requests must be for sections of the same subject"
    }
}

/**
 * Example: Rejecting a Swap Request
 */
async function exampleRejectSwap() {
    const swapRequestId = 'swap-request-uuid';
    const targetStudentId = 'student-b-uuid';

    try {
        const response = await respondToSwapRequest(
            swapRequestId,
            targetStudentId,
            false, // Reject
            'Sorry, this section time doesn\'t work for me'
        );

        if (response.success && response.status === 'rejected') {
            console.log('✓ Swap request rejected');
            console.log('  Requester has been notified');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Example: Schedule Clash Prevention During Swap
 * 
 * The system automatically detects if swapping would create schedule conflicts
 */
async function exampleSwapWithClashDetection() {
    // Student A has classes on Monday 9-11am and Wednesday 3-5pm
    // Student A wants to swap into Student B's section: Wednesday 2-4pm
    // This would create a clash with their existing Wednesday 3-5pm class

    const studentA = {
        id: 'student-a-uuid',
        sectionId: 'section-to-swap-from'
    };

    const studentB = {
        id: 'student-b-uuid',
        sectionId: 'section-wednesday-2-4pm' // This conflicts!
    };

    try {
        await createSwapRequest(
            studentA.id,
            studentA.sectionId,
            studentB.id,
            studentB.sectionId
        );
    } catch (error) {
        // Will throw: "Requester would have schedule clash: Clashes with CSC302 Section A on wednesday 15:00-17:00"
        console.log('Swap blocked due to schedule clash:');
        console.log(error.message);
        console.log('\nStudent needs to either:');
        console.log('1. Choose a different section');
        console.log('2. Drop the conflicting class first');
    }
}

/**
 * Example: Viewing Swap Request History
 */
async function exampleViewSwapHistory() {
    const studentId = 'student-uuid';

    // View all swap requests (sent and received)
    const allRequests = await getSwapRequests(studentId);

    console.log(`\nSwap Request History for Student:`);
    console.log(`Total requests: ${allRequests.length}\n`);

    allRequests.forEach(req => {
        const isRequester = req.requester_id === studentId;
        const role = isRequester ? 'SENT' : 'RECEIVED';

        console.log(`[${role}] ${req.status.toUpperCase()}`);
        console.log(`  Subject: ${req.requester_subject_code}`);
        console.log(`  From Section: ${req.requester_section_number}`);
        console.log(`  To Section: ${req.target_section_number}`);
        console.log(`  Created: ${new Date(req.created_at).toLocaleDateString()}`);

        if (req.responded_at) {
            console.log(`  Responded: ${new Date(req.responded_at).toLocaleDateString()}`);
        }
        console.log('');
    });

    // View only pending requests
    const pending = await getSwapRequests(studentId, 'pending');
    console.log(`Pending requests: ${pending.length}`);
}

// Export examples
module.exports = {
    exampleSwapRequestFlow,
    exampleRejectSwap,
    exampleSwapWithClashDetection,
    exampleViewSwapHistory
};
