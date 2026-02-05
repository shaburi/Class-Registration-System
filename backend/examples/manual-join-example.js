/**
 * Example: Manual Join Request Flow
 * 
 * This example demonstrates how students can request to join full sections
 * and how lecturers/HOP approve or reject these requests.
 */

const {
    createManualJoinRequest,
    approveManualJoinRequest,
    rejectManualJoinRequest,
    getManualJoinRequestsForStudent,
    getManualJoinRequestsForLecturer
} = require('../services/manualJoin.service');

/**
 * Scenario: Student wants to join a full section
 */
async function exampleManualJoinFlow() {
    const studentId = 'student-uuid';
    const fullSectionId = 'section-uuid'; // This section is at capacity

    try {
        // Step 1: Student creates manual join request
        console.log('Step 1: Student submits manual join request...');
        const request = await createManualJoinRequest(
            studentId,
            fullSectionId,
            'I need this class to graduate this semester. My advisor approved this request.'
        );

        if (request.success) {
            console.log('✓ Manual join request submitted');
            console.log(`  Request ID: ${request.request.id}`);
            console.log(`  Status: Pending approval`);
            console.log('  Waiting for lecturer or Head of Programme approval...\n');

            // Step 2: Lecturer views pending requests
            const lecturerId = 'lecturer-uuid';
            console.log('Step 2: Lecturer reviews manual join requests...');

            const pendingRequests = await getManualJoinRequestsForLecturer(lecturerId, 'pending');

            console.log(`Found ${pendingRequests.length} pending request(s):\n`);
            pendingRequests.forEach(req => {
                console.log(`Request ID: ${req.id}`);
                console.log(`Student: ${req.student_name} (${req.student_number})`);
                console.log(`Subject: ${req.subject_code} ${req.subject_name}`);
                console.log(`Section: ${req.section_number}`);
                console.log(`Reason: "${req.reason}"`);
                console.log(`Current enrollment: ${req.enrolled_count}/${req.capacity}`);
                console.log('');
            });

            // Step 3: Lecturer approves the request
            console.log('Step 3: Lecturer approves the request...');
            const approval = await approveManualJoinRequest(
                request.request.id,
                lecturerId,
                'lecturer',
                'Valid academic reason. Student is in good standing.'
            );

            if (approval.success) {
                console.log('✓ Request approved!');
                console.log('  Student has been automatically registered');
                console.log('  Section capacity has been exceeded by manual approval');
                console.log('  Student and HOP have been notified');
            }
        }

    } catch (error) {
        console.error('✗ Manual join request failed:');
        console.error(`  Error: ${error.message}`);

        // Common errors:
        // - "A pending manual join request already exists for this section"
        // - "Student is already registered for CSC301 in another section"
        // - "Section is for semester 3, but student is in semester 4"
    }
}

/**
 * Example: Lecturer Rejecting Manual Join Request
 */
async function exampleRejectManualJoin() {
    const requestId = 'request-uuid';
    const lecturerId = 'lecturer-uuid';

    try {
        console.log('Lecturer rejecting manual join request...');

        const rejection = await rejectManualJoinRequest(
            requestId,
            lecturerId,
            'lecturer',
            'Section is already over capacity with previous manual approvals. Please consider Section B which has availability.'
        );

        if (rejection.success) {
            console.log('✓ Request rejected');
            console.log('  Student has been notified with reason');
            console.log('  Student can submit new request for different section');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Example: HOP Approving Request (Higher Authority)
 */
async function exampleHOPApproval() {
    const requestId = 'request-uuid';
    const hopId = 'hop-uuid';

    try {
        console.log('HOP reviewing and approving manual join request...');

        // HOP can approve ANY manual join request, regardless of section lecturer
        const approval = await approveManualJoinRequest(
            requestId,
            hopId,
            'hop',
            'Approved by programme director. Special case for graduating student.'
        );

        if (approval.success) {
            console.log('✓ HOP approval successful');
            console.log('  This overrides any section capacity limits');
            console.log('  Student registered successfully');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Example: Student Viewing Their Manual Join Request Status
 */
async function exampleStudentViewRequests() {
    const studentId = 'student-uuid';

    try {
        // View all manual join requests
        const allRequests = await getManualJoinRequestsForStudent(studentId);

        console.log(`Manual Join Request History:`);
        console.log(`Total requests: ${allRequests.length}\n`);

        allRequests.forEach(req => {
            console.log(`Subject: ${req.subject_code} ${req.subject_name}`);
            console.log(`Section: ${req.section_number}`);
            console.log(`Status: ${req.status.toUpperCase()}`);
            console.log(`Submitted: ${new Date(req.created_at).toLocaleDateString()}`);
            console.log(`Reason: "${req.reason}"`);

            if (req.status === 'approved') {
                console.log(`✓ Approved by: ${req.approver_name}`);
                console.log(`  Approval reason: ${req.approval_reason || 'None provided'}`);
                console.log(`  Approved on: ${new Date(req.approved_at).toLocaleDateString()}`);
            } else if (req.status === 'rejected') {
                console.log(`✗ Rejected by: ${req.rejecter_name}`);
                console.log(`  Rejection reason: ${req.rejection_reason}`);
                console.log(`  Rejected on: ${new Date(req.rejected_at).toLocaleDateString()}`);
            } else {
                console.log(`⏳ Pending approval from lecturer or HOP`);
            }
            console.log('');
        });

        // View only pending requests
        const pending = await getManualJoinRequestsForStudent(studentId, 'pending');
        if (pending.length > 0) {
            console.log(`You have ${pending.length} pending manual join request(s)`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Example: Automatic Registration After Approval
 * 
 * When a manual join request is approved, the student is automatically
 * registered for the section with registration_type = 'manual'
 */
async function exampleAutoRegistration() {
    const requestId = 'request-uuid';
    const lecturerId = 'lecturer-uuid';

    try {
        console.log('Before approval:');
        console.log('  Section enrolled_count: 30/30 (FULL)');
        console.log('  Student registration: None\n');

        await approveManualJoinRequest(requestId, lecturerId, 'lecturer', 'Approved');

        console.log('After approval:');
        console.log('  Section enrolled_count: 31/30 (Over capacity by manual approval)');
        console.log('  Student registration: REGISTERED (type: manual)');
        console.log('  Student can now see section in their timetable');

    } catch (error) {
        // If registration fails (e.g., schedule clash), request is auto-rejected
        console.error('Approval failed - request automatically rejected');
        console.error(`Reason: ${error.message}`);
    }
}

// Export examples
module.exports = {
    exampleManualJoinFlow,
    exampleRejectManualJoin,
    exampleHOPApproval,
    exampleStudentViewRequests,
    exampleAutoRegistration
};
