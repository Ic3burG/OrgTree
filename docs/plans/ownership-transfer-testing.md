# Organization Ownership Transfer Testing Plan

## Overview
This document outlines the testing strategy for the Organization Ownership Transfer feature. The goal is to ensure security, data integrity, and a smooth user experience.

## 1. Backend Unit Tests (`server/src/services/ownership-transfer.service.test.ts`)

### Initiation
- [ ] Should allow Organization Owner to initiate transfer
- [ ] Should reject initiation from non-owners (even Admins)
- [ ] Should reject transfer to self
- [ ] Should reject transfer to non-existent user
- [ ] Should reject if a pending transfer already exists
- [ ] Should require a reason of minimum length
- [ ] Should create audit log entry on success

### Acceptance
- [ ] Should allow target user to accept pending transfer
- [ ] Should reject acceptance from non-target users
- [ ] Should reject acceptance of expired transfers
- [ ] Should reject acceptance of cancelled/rejected transfers
- [ ] **State Change Verification**:
    - [ ] Old owner should be demoted to Admin
    - [ ] New owner should be set in `organizations` table
    - [ ] New owner should be removed from `organization_members` (as they are now the owner on the org record)
    - [ ] Transfer status should update to `accepted`
    - [ ] `completed_at` should be set

### Rejection
- [ ] Should allow target user to reject transfer
- [ ] Should update status to `rejected`
- [ ] Should not change organization ownership
- [ ] Should create audit log entry

### Cancellation
- [ ] Should allow initiator (Old Owner) to cancel transfer
- [ ] Should update status to `cancelled`
- [ ] Should create audit log entry

### Expiration
- [ ] Should identify transfers older than 7 days
- [ ] Should mark them as `expired`
- [ ] Should return count of expired transfers

## 2. API Integration Tests (`server/tests/api/ownership-transfer.test.ts`)

- [ ] `POST /organizations/:orgId/ownership/transfer`: Auth & Permission checks
- [ ] `GET /organizations/:orgId/ownership/transfers`: Listing and filtering
- [ ] `POST /ownership-transfers/:transferId/accept`: Full flow integration
- [ ] `POST /ownership-transfers/:transferId/reject`: Full flow integration
- [ ] `POST /ownership-transfers/:transferId/cancel`: Full flow integration

## 3. Frontend Component Tests

### TransferOwnershipModal
- [ ] Should not submit without reason
- [ ] Should not submit without "TRANSFER" confirmation
- [ ] Should display error messages from API

### PendingTransferBanner
- [ ] Should display correct text for Initiator vs Recipient
- [ ] Should call correct API methods on button clicks
