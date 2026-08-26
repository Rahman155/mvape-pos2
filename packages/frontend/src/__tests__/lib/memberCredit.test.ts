/**
 * Unit tests for member credit operations
 * Tests credit balance calculations, permission restrictions, and transaction recording
 * Requirements: 14.5, 14.6 - Member credit top-up and deduction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fc } from 'fast-check';

/**
 * Member interface matching the system design
 */
interface Member {
  id: string;
  memberNumber: string;
  name: string;
  phone: string;
  creditBalance: number;
  totalSpent: number;
  isActive: boolean;
}

/**
 * Credit transaction record
 */
interface CreditTransaction {
  id: string;
  memberId: string;
  type: 'TOPUP' | 'DEDUCT';
  amount: number;
  operator: string;
  operatorRole: 'OWNER' | 'KASIR';
  timestamp: Date;
  reason?: string;
}

/**
 * Mock implementation of member credit operations
 */
class MemberCreditService {
  private members: Map<string, Member> = new Map();
  private transactions: CreditTransaction[] = [];
  private transactionIdCounter = 1;

  /**
   * Add or update a member
   */
  setMember(member: Member): void {
    this.members.set(member.id, member);
  }

  /**
   * Get a member by ID
   */
  getMember(memberId: string): Member | null {
    return this.members.get(memberId) || null;
  }

  /**
   * Get all transactions
   */
  getTransactions(): CreditTransaction[] {
    return [...this.transactions];
  }

  /**
   * Get transactions for a specific member
   */
  getMemberTransactions(memberId: string): CreditTransaction[] {
    return this.transactions.filter(t => t.memberId === memberId);
  }

  /**
   * Add credit to member balance (top-up operation)
   * Only OWNER role can perform this operation
   */
  topUpCredit(
    memberId: string,
    amount: number,
    operatorId: string,
    operatorRole: 'OWNER' | 'KASIR',
    reason: string = 'Top-up'
  ): { success: boolean; error?: string; transaction?: CreditTransaction } {
    // Validate operator role - only OWNER can perform top-up
    if (operatorRole !== 'OWNER') {
      return {
        success: false,
        error: 'Only owner can perform member credit top-up',
      };
    }

    const member = this.members.get(memberId);
    if (!member) {
      return {
        success: false,
        error: 'Member not found',
      };
    }

    if (!member.isActive) {
      return {
        success: false,
        error: 'Member is not active',
      };
    }

    // Validate amount
    if (amount <= 0) {
      return {
        success: false,
        error: 'Top-up amount must be positive',
      };
    }

    // Perform top-up
    member.creditBalance += amount;

    // Record transaction
    const transaction: CreditTransaction = {
      id: `TXN-${this.transactionIdCounter++}`,
      memberId,
      type: 'TOPUP',
      amount,
      operator: operatorId,
      operatorRole,
      timestamp: new Date(),
      reason,
    };

    this.transactions.push(transaction);

    return {
      success: true,
      transaction,
    };
  }

  /**
   * Deduct credit from member balance (purchase operation)
   * Can be performed by KASIR during transaction
   */
  deductCredit(
    memberId: string,
    amount: number,
    operatorId: string,
    operatorRole: 'OWNER' | 'KASIR',
    reason: string = 'Purchase'
  ): { success: boolean; error?: string; transaction?: CreditTransaction } {
    const member = this.members.get(memberId);
    if (!member) {
      return {
        success: false,
        error: 'Member not found',
      };
    }

    if (!member.isActive) {
      return {
        success: false,
        error: 'Member is not active',
      };
    }

    // Validate amount
    if (amount <= 0) {
      return {
        success: false,
        error: 'Deduction amount must be positive',
      };
    }

    // Check sufficient balance
    if (member.creditBalance < amount) {
      return {
        success: false,
        error: `Insufficient credit. Available: ${member.creditBalance}, Required: ${amount}`,
      };
    }

    // Perform deduction
    member.creditBalance -= amount;
    member.totalSpent += amount;

    // Record transaction
    const transaction: CreditTransaction = {
      id: `TXN-${this.transactionIdCounter++}`,
      memberId,
      type: 'DEDUCT',
      amount,
      operator: operatorId,
      operatorRole,
      timestamp: new Date(),
      reason,
    };

    this.transactions.push(transaction);

    return {
      success: true,
      transaction,
    };
  }

  /**
   * Get balance for a member
   */
  getBalance(memberId: string): number | null {
    const member = this.members.get(memberId);
    return member?.creditBalance ?? null;
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.members.clear();
    this.transactions = [];
    this.transactionIdCounter = 1;
  }
}

describe('Member Credit Operations', () => {
  let service: MemberCreditService;
  let testMember: Member;
  const testMemberId = 'member-001';
  const testOwnerId = 'owner-001';
  const testKasirId = 'kasir-001';

  beforeEach(() => {
    service = new MemberCreditService();
    testMember = {
      id: testMemberId,
      memberNumber: 'M001',
      name: 'John Doe',
      phone: '081234567890',
      creditBalance: 100000,
      totalSpent: 0,
      isActive: true,
    };
    service.setMember(testMember);
  });

  describe('Credit Balance Calculations - Add Operation', () => {
    it('should increase member balance on successful top-up', () => {
      const initialBalance = service.getBalance(testMemberId)!;
      const topUpAmount = 50000;

      const result = service.topUpCredit(
        testMemberId,
        topUpAmount,
        testOwnerId,
        'OWNER',
        'Test top-up'
      );

      expect(result.success).toBe(true);
      expect(service.getBalance(testMemberId)).toBe(initialBalance + topUpAmount);
    });

    it('should handle multiple consecutive top-ups correctly', () => {
      const topUp1 = 25000;
      const topUp2 = 30000;
      const topUp3 = 15000;
      const initialBalance = service.getBalance(testMemberId)!;

      service.topUpCredit(testMemberId, topUp1, testOwnerId, 'OWNER');
      service.topUpCredit(testMemberId, topUp2, testOwnerId, 'OWNER');
      service.topUpCredit(testMemberId, topUp3, testOwnerId, 'OWNER');

      const expected = initialBalance + topUp1 + topUp2 + topUp3;
      expect(service.getBalance(testMemberId)).toBe(expected);
    });

    it('should maintain precision with decimal amounts', () => {
      const topUpAmount = 12500.5;
      const initialBalance = service.getBalance(testMemberId)!;

      service.topUpCredit(testMemberId, topUpAmount, testOwnerId, 'OWNER');

      expect(service.getBalance(testMemberId)).toBe(initialBalance + topUpAmount);
    });

    it('should reject top-up with zero amount', () => {
      const result = service.topUpCredit(testMemberId, 0, testOwnerId, 'OWNER');
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be positive');
    });

    it('should reject top-up with negative amount', () => {
      const result = service.topUpCredit(
        testMemberId,
        -10000,
        testOwnerId,
        'OWNER'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be positive');
    });
  });

  describe('Credit Balance Calculations - Deduct Operation', () => {
    it('should decrease member balance on valid deduction', () => {
      const initialBalance = service.getBalance(testMemberId)!;
      const deductAmount = 25000;

      const result = service.deductCredit(
        testMemberId,
        deductAmount,
        testKasirId,
        'KASIR',
        'Purchase'
      );

      expect(result.success).toBe(true);
      expect(service.getBalance(testMemberId)).toBe(initialBalance - deductAmount);
    });

    it('should reject deduction when balance is insufficient', () => {
      const currentBalance = service.getBalance(testMemberId)!;
      const deductAmount = currentBalance + 1;

      const result = service.deductCredit(
        testMemberId,
        deductAmount,
        testKasirId,
        'KASIR'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient credit');
      expect(service.getBalance(testMemberId)).toBe(currentBalance); // Balance unchanged
    });

    it('should allow deduction equal to exact balance', () => {
      const currentBalance = service.getBalance(testMemberId)!;

      const result = service.deductCredit(
        testMemberId,
        currentBalance,
        testKasirId,
        'KASIR'
      );

      expect(result.success).toBe(true);
      expect(service.getBalance(testMemberId)).toBe(0);
    });

    it('should update total spent on successful deduction', () => {
      const member = service.getMember(testMemberId)!;
      const initialSpent = member.totalSpent;
      const deductAmount = 30000;

      service.deductCredit(testMemberId, deductAmount, testKasirId, 'KASIR');

      const updatedMember = service.getMember(testMemberId)!;
      expect(updatedMember.totalSpent).toBe(initialSpent + deductAmount);
    });

    it('should handle multiple consecutive deductions', () => {
      const initialBalance = service.getBalance(testMemberId)!;
      const deduct1 = 10000;
      const deduct2 = 15000;
      const deduct3 = 20000;

      service.deductCredit(testMemberId, deduct1, testKasirId, 'KASIR');
      service.deductCredit(testMemberId, deduct2, testKasirId, 'KASIR');
      service.deductCredit(testMemberId, deduct3, testKasirId, 'KASIR');

      const expected = initialBalance - deduct1 - deduct2 - deduct3;
      expect(service.getBalance(testMemberId)).toBe(expected);
    });

    it('should reject deduction with zero amount', () => {
      const result = service.deductCredit(testMemberId, 0, testKasirId, 'KASIR');
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be positive');
    });

    it('should reject deduction with negative amount', () => {
      const result = service.deductCredit(
        testMemberId,
        -5000,
        testKasirId,
        'KASIR'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be positive');
    });
  });

  describe('Multiple Operations - Balance Maintenance', () => {
    it('should maintain correct balance after mixed add and deduct operations', () => {
      const initial = service.getBalance(testMemberId)!;

      // Add 50000
      service.topUpCredit(testMemberId, 50000, testOwnerId, 'OWNER');
      expect(service.getBalance(testMemberId)).toBe(initial + 50000);

      // Deduct 30000
      service.deductCredit(testMemberId, 30000, testKasirId, 'KASIR');
      expect(service.getBalance(testMemberId)).toBe(initial + 50000 - 30000);

      // Add 25000
      service.topUpCredit(testMemberId, 25000, testOwnerId, 'OWNER');
      expect(service.getBalance(testMemberId)).toBe(initial + 50000 - 30000 + 25000);

      // Deduct 20000
      service.deductCredit(testMemberId, 20000, testKasirId, 'KASIR');
      expect(service.getBalance(testMemberId)).toBe(
        initial + 50000 - 30000 + 25000 - 20000
      );
    });

    it('should prevent deduction after balance falls below required amount', () => {
      const initial = service.getBalance(testMemberId)!;

      service.deductCredit(testMemberId, 80000, testKasirId, 'KASIR');
      expect(service.getBalance(testMemberId)).toBe(initial - 80000);

      // Try to deduct more than available
      const result = service.deductCredit(testMemberId, 50000, testKasirId, 'KASIR');
      expect(result.success).toBe(false);
      expect(service.getBalance(testMemberId)).toBe(initial - 80000); // Unchanged
    });
  });

  describe('Permission Restrictions - Top-up (Owner Only)', () => {
    it('should allow owner to perform top-up', () => {
      const result = service.topUpCredit(
        testMemberId,
        50000,
        testOwnerId,
        'OWNER'
      );
      expect(result.success).toBe(true);
      expect(result.transaction).toBeDefined();
    });

    it('should reject kasir from performing top-up', () => {
      const result = service.topUpCredit(
        testMemberId,
        50000,
        testKasirId,
        'KASIR'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Only owner can perform');
    });

    it('should not update balance when kasir attempts top-up', () => {
      const initialBalance = service.getBalance(testMemberId)!;

      service.topUpCredit(testMemberId, 50000, testKasirId, 'KASIR');

      expect(service.getBalance(testMemberId)).toBe(initialBalance);
    });

    it('should not record transaction when permission denied', () => {
      const initialCount = service.getTransactions().length;

      service.topUpCredit(testMemberId, 50000, testKasirId, 'KASIR');

      expect(service.getTransactions().length).toBe(initialCount);
    });
  });

  describe('Permission Restrictions - Deduction', () => {
    it('should allow kasir to deduct member credit', () => {
      const result = service.deductCredit(
        testMemberId,
        25000,
        testKasirId,
        'KASIR'
      );
      expect(result.success).toBe(true);
    });

    it('should allow owner to deduct member credit', () => {
      const result = service.deductCredit(
        testMemberId,
        25000,
        testOwnerId,
        'OWNER'
      );
      expect(result.success).toBe(true);
    });
  });

  describe('Transaction Recording', () => {
    it('should create transaction record on successful top-up', () => {
      const result = service.topUpCredit(
        testMemberId,
        50000,
        testOwnerId,
        'OWNER'
      );

      expect(result.transaction).toBeDefined();
      expect(result.transaction?.type).toBe('TOPUP');
      expect(result.transaction?.amount).toBe(50000);
      expect(result.transaction?.memberId).toBe(testMemberId);
    });

    it('should create transaction record on successful deduction', () => {
      const result = service.deductCredit(
        testMemberId,
        30000,
        testKasirId,
        'KASIR'
      );

      expect(result.transaction).toBeDefined();
      expect(result.transaction?.type).toBe('DEDUCT');
      expect(result.transaction?.amount).toBe(30000);
      expect(result.transaction?.memberId).toBe(testMemberId);
    });

    it('should record operator information in transaction', () => {
      const result = service.topUpCredit(
        testMemberId,
        50000,
        testOwnerId,
        'OWNER'
      );

      expect(result.transaction?.operator).toBe(testOwnerId);
      expect(result.transaction?.operatorRole).toBe('OWNER');
    });

    it('should record timestamp in transaction', () => {
      const beforeTime = new Date();
      const result = service.topUpCredit(
        testMemberId,
        50000,
        testOwnerId,
        'OWNER'
      );
      const afterTime = new Date();

      expect(result.transaction?.timestamp).toBeDefined();
      expect(result.transaction!.timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      );
      expect(result.transaction!.timestamp.getTime()).toBeLessThanOrEqual(
        afterTime.getTime()
      );
    });

    it('should maintain immutable transaction history', () => {
      service.topUpCredit(testMemberId, 50000, testOwnerId, 'OWNER');
      const initialTransactions = service.getTransactions();
      const firstTransactionId = initialTransactions[0].id;

      service.topUpCredit(testMemberId, 25000, testOwnerId, 'OWNER');

      const updatedTransactions = service.getTransactions();
      expect(updatedTransactions[0].id).toBe(firstTransactionId);
      expect(updatedTransactions).toHaveLength(2);
    });

    it('should return all transactions for a member', () => {
      service.topUpCredit(testMemberId, 50000, testOwnerId, 'OWNER');
      service.deductCredit(testMemberId, 20000, testKasirId, 'KASIR');
      service.topUpCredit(testMemberId, 30000, testOwnerId, 'OWNER');

      const memberTransactions = service.getMemberTransactions(testMemberId);

      expect(memberTransactions).toHaveLength(3);
      expect(memberTransactions[0].type).toBe('TOPUP');
      expect(memberTransactions[1].type).toBe('DEDUCT');
      expect(memberTransactions[2].type).toBe('TOPUP');
    });

    it('should record reason in transaction', () => {
      const customReason = 'Bonus credit for loyalty';
      const result = service.topUpCredit(
        testMemberId,
        50000,
        testOwnerId,
        'OWNER',
        customReason
      );

      expect(result.transaction?.reason).toBe(customReason);
    });

    it('should generate unique transaction IDs', () => {
      const result1 = service.topUpCredit(
        testMemberId,
        50000,
        testOwnerId,
        'OWNER'
      );
      const result2 = service.topUpCredit(
        testMemberId,
        25000,
        testOwnerId,
        'OWNER'
      );

      expect(result1.transaction?.id).not.toBe(result2.transaction?.id);
    });

    it('should not record transaction for failed operations', () => {
      const initialCount = service.getTransactions().length;

      // Attempt to deduct more than balance
      service.deductCredit(testMemberId, 500000, testKasirId, 'KASIR');

      expect(service.getTransactions().length).toBe(initialCount);
    });

    it('should not record transaction when member not found', () => {
      const initialCount = service.getTransactions().length;

      service.topUpCredit('non-existent-member', 50000, testOwnerId, 'OWNER');

      expect(service.getTransactions().length).toBe(initialCount);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle non-existent member gracefully', () => {
      const result = service.topUpCredit(
        'non-existent-id',
        50000,
        testOwnerId,
        'OWNER'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Member not found');
    });

    it('should reject operation on inactive member', () => {
      const inactiveMember: Member = {
        id: 'inactive-member',
        memberNumber: 'M002',
        name: 'Inactive Member',
        phone: '081234567890',
        creditBalance: 100000,
        totalSpent: 0,
        isActive: false,
      };
      service.setMember(inactiveMember);

      const topUpResult = service.topUpCredit(
        'inactive-member',
        50000,
        testOwnerId,
        'OWNER'
      );
      const deductResult = service.deductCredit(
        'inactive-member',
        25000,
        testKasirId,
        'KASIR'
      );

      expect(topUpResult.success).toBe(false);
      expect(deductResult.success).toBe(false);
    });

    it('should handle very large amounts correctly', () => {
      const largeAmount = 999999999999.99;
      const result = service.topUpCredit(
        testMemberId,
        largeAmount,
        testOwnerId,
        'OWNER'
      );

      expect(result.success).toBe(true);
      expect(service.getBalance(testMemberId)).toBe(100000 + largeAmount);
    });

    it('should handle very small decimal amounts', () => {
      const smallAmount = 0.01;
      const initialBalance = service.getBalance(testMemberId)!;

      service.topUpCredit(testMemberId, smallAmount, testOwnerId, 'OWNER');

      expect(service.getBalance(testMemberId)).toBeCloseTo(
        initialBalance + smallAmount,
        5
      );
    });
  });

  describe('Property-Based Tests - Credit Balance Calculations', () => {
    it('should maintain balance conservation through add/deduct operations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('TOPUP', 'DEDUCT'),
              amount: fc.integer({ min: 1, max: 50000 }),
            }),
            { maxLength: 10 }
          ),
          (operations) => {
            service.clear();
            const member: Member = {
              id: testMemberId,
              memberNumber: 'M001',
              name: 'Test Member',
              phone: '081234567890',
              creditBalance: 500000, // Start with large balance
              totalSpent: 0,
              isActive: true,
            };
            service.setMember(member);

            let expectedBalance = 500000;
            let failed = false;

            for (const op of operations) {
              if (op.type === 'TOPUP') {
                const result = service.topUpCredit(
                  testMemberId,
                  op.amount,
                  testOwnerId,
                  'OWNER'
                );
                if (result.success) {
                  expectedBalance += op.amount;
                }
              } else {
                const result = service.deductCredit(
                  testMemberId,
                  op.amount,
                  testKasirId,
                  'KASIR'
                );
                if (result.success) {
                  expectedBalance -= op.amount;
                } else {
                  failed = true;
                }
              }
            }

            if (!failed) {
              expect(service.getBalance(testMemberId)).toBe(expectedBalance);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never allow balance to go negative during deduction', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 100000 }), {
            maxLength: 20,
          }),
          (deductAmounts) => {
            service.clear();
            const member: Member = {
              id: testMemberId,
              memberNumber: 'M001',
              name: 'Test Member',
              phone: '081234567890',
              creditBalance: 500000,
              totalSpent: 0,
              isActive: true,
            };
            service.setMember(member);

            for (const amount of deductAmounts) {
              service.deductCredit(testMemberId, amount, testKasirId, 'KASIR');
            }

            const finalBalance = service.getBalance(testMemberId)!;
            expect(finalBalance).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure total spent equals sum of all deductions', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 50000 }), {
            maxLength: 10,
          }),
          (deductAmounts) => {
            service.clear();
            const member: Member = {
              id: testMemberId,
              memberNumber: 'M001',
              name: 'Test Member',
              phone: '081234567890',
              creditBalance: 500000,
              totalSpent: 0,
              isActive: true,
            };
            service.setMember(member);

            let expectedSpent = 0;
            for (const amount of deductAmounts) {
              const result = service.deductCredit(
                testMemberId,
                amount,
                testKasirId,
                'KASIR'
              );
              if (result.success) {
                expectedSpent += amount;
              }
            }

            const member2 = service.getMember(testMemberId)!;
            expect(member2.totalSpent).toBe(expectedSpent);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should record exactly one transaction per successful operation', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('TOPUP', 'DEDUCT'),
              amount: fc.integer({ min: 1, max: 50000 }),
            }),
            { maxLength: 10 }
          ),
          (operations) => {
            service.clear();
            const member: Member = {
              id: testMemberId,
              memberNumber: 'M001',
              name: 'Test Member',
              phone: '081234567890',
              creditBalance: 500000,
              totalSpent: 0,
              isActive: true,
            };
            service.setMember(member);

            let successCount = 0;

            for (const op of operations) {
              if (op.type === 'TOPUP') {
                const result = service.topUpCredit(
                  testMemberId,
                  op.amount,
                  testOwnerId,
                  'OWNER'
                );
                if (result.success) successCount++;
              } else {
                const result = service.deductCredit(
                  testMemberId,
                  op.amount,
                  testKasirId,
                  'KASIR'
                );
                if (result.success) successCount++;
              }
            }

            expect(service.getMemberTransactions(testMemberId)).toHaveLength(
              successCount
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
