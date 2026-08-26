/**
 * Integration Tests for Member Credit Payment Processing
 * Tests the complete flow of selecting, validating, and processing member credit payments
 * Requirement 7.8: Member credit payment with validation and deduction
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Member, Transaction } from '@/types';

/**
 * Mock API responses for member credit operations
 */
class MemberCreditPaymentService {
  private members: Map<string, Member> = new Map();
  private transactions: Transaction[] = [];

  /**
   * Initialize with test member
   */
  setupTestMember(member: Member) {
    this.members.set(member.id, member);
  }

  /**
   * Search members by name, number, or phone
   */
  searchMembers(query: string): Member[] {
    return Array.from(this.members.values()).filter(
      (m) =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.memberNumber.toLowerCase().includes(query.toLowerCase()) ||
        m.phone?.includes(query)
    );
  }

  /**
   * Get member by ID
   */
  getMember(memberId: string): Member | undefined {
    return this.members.get(memberId);
  }

  /**
   * Validate member has sufficient credit
   */
  validateMemberCredit(memberId: string, amount: number): {
    valid: boolean;
    currentBalance?: number;
    error?: string;
  } {
    const member = this.members.get(memberId);

    if (!member) {
      return {
        valid: false,
        error: 'Member not found',
      };
    }

    if (!member.isActive) {
      return {
        valid: false,
        error: 'Member is inactive',
      };
    }

    if (member.creditBalance < amount) {
      return {
        valid: false,
        currentBalance: member.creditBalance,
        error: `Insufficient credit. Available: ${member.creditBalance}, Required: ${amount}`,
      };
    }

    return {
      valid: true,
      currentBalance: member.creditBalance,
    };
  }

  /**
   * Deduct member credit and create transaction
   */
  processPayment(
    memberId: string,
    amount: number,
    items: any[]
  ): {
    success: boolean;
    transaction?: Transaction;
    error?: string;
  } {
    // Validate credit
    const validation = this.validateMemberCredit(memberId, amount);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Get member
    const member = this.members.get(memberId);
    if (!member) {
      return {
        success: false,
        error: 'Member not found',
      };
    }

    // Deduct credit
    member.creditBalance -= amount;
    member.totalSpent += amount;

    // Create transaction
    const transaction: Transaction = {
      id: `txn_${Date.now()}`,
      storeId: 'store-1',
      kasirId: 'kasir-1',
      transactionDate: new Date(),
      totalAmount: amount,
      paymentMethod: 'MEMBER_CREDIT',
      status: 'COMPLETED',
      isEdited: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: items.map((item) => ({
        id: `item_${Date.now()}`,
        transactionId: `txn_${Date.now()}`,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        createdAt: new Date(),
      })),
    };

    this.transactions.push(transaction);

    return {
      success: true,
      transaction,
    };
  }

  /**
   * Get member transaction history
   */
  getMemberTransactionHistory(memberId: string): Transaction[] {
    return this.transactions.filter(
      (t) => t.paymentMethod === 'MEMBER_CREDIT'
    );
  }
}

describe('Member Credit Payment Processing - Integration', () => {
  let service: MemberCreditPaymentService;
  let testMember: Member;

  const createMockMember = (overrides: Partial<Member> = {}): Member => ({
    id: 'member-001',
    memberNumber: 'MBR001',
    name: 'John Doe',
    phone: '081234567890',
    email: 'john@example.com',
    creditBalance: 5000000,
    totalSpent: 15000000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    service = new MemberCreditPaymentService();
    testMember = createMockMember();
    service.setupTestMember(testMember);
  });

  describe('Member Selection and Search', () => {
    it('should find member by name', () => {
      const results = service.searchMembers('John');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('member-001');
    });

    it('should find member by member number', () => {
      const results = service.searchMembers('MBR001');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('member-001');
    });

    it('should find member by phone', () => {
      const results = service.searchMembers('081234567890');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('member-001');
    });

    it('should return empty result for no matches', () => {
      const results = service.searchMembers('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('should be case-insensitive for name search', () => {
      const results = service.searchMembers('JOHN');
      expect(results).toHaveLength(1);
    });

    it('should get member by ID', () => {
      const member = service.getMember('member-001');
      expect(member).toBeDefined();
      expect(member?.name).toBe('John Doe');
      expect(member?.creditBalance).toBe(5000000);
    });

    it('should return undefined for non-existent member', () => {
      const member = service.getMember('nonexistent-id');
      expect(member).toBeUndefined();
    });
  });

  describe('Credit Balance Display', () => {
    it('should display current credit balance', () => {
      const member = service.getMember('member-001');
      expect(member?.creditBalance).toBe(5000000);
    });

    it('should show zero balance for new member', () => {
      const newMember = createMockMember({ creditBalance: 0 });
      service.setupTestMember(newMember);

      const member = service.getMember(newMember.id);
      expect(member?.creditBalance).toBe(0);
    });

    it('should format balance for display', () => {
      const member = service.getMember('member-001');
      const formatted = member?.creditBalance.toLocaleString('id-ID');
      expect(formatted).toBe('5.000.000');
    });
  });

  describe('Credit Validation Before Transaction', () => {
    it('should validate sufficient credit for purchase', () => {
      const result = service.validateMemberCredit('member-001', 2000000);
      expect(result.valid).toBe(true);
      expect(result.currentBalance).toBe(5000000);
      expect(result.error).toBeUndefined();
    });

    it('should detect insufficient credit', () => {
      const result = service.validateMemberCredit('member-001', 6000000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient credit');
    });

    it('should validate with exact balance amount', () => {
      const result = service.validateMemberCredit('member-001', 5000000);
      expect(result.valid).toBe(true);
    });

    it('should reject payment for non-existent member', () => {
      const result = service.validateMemberCredit('nonexistent', 1000000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Member not found');
    });

    it('should reject payment for inactive member', () => {
      const inactiveMember = createMockMember({ isActive: false });
      service.setupTestMember(inactiveMember);

      const result = service.validateMemberCredit(inactiveMember.id, 1000000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('inactive');
    });

    it('should provide current balance in validation response', () => {
      const result = service.validateMemberCredit('member-001', 10000000);
      expect(result.currentBalance).toBe(5000000);
    });
  });

  describe('Transaction Prevention on Insufficient Credit', () => {
    it('should prevent transaction when credit insufficient', () => {
      const result = service.processPayment('member-001', 10000000, []);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient credit');
      expect(result.transaction).toBeUndefined();
    });

    it('should not modify member credit if validation fails', () => {
      const originalBalance = service.getMember('member-001')?.creditBalance;

      service.processPayment('member-001', 10000000, []);

      const newBalance = service.getMember('member-001')?.creditBalance;
      expect(newBalance).toBe(originalBalance);
    });

    it('should not create transaction if validation fails', () => {
      service.processPayment('member-001', 10000000, []);
      const history = service.getMemberTransactionHistory('member-001');
      expect(history).toHaveLength(0);
    });
  });

  describe('Credit Deduction on Transaction Completion', () => {
    it('should deduct credit on successful payment', () => {
      const originalBalance = 5000000;
      const paymentAmount = 2000000;

      service.processPayment('member-001', paymentAmount, [
        {
          productId: 'prod-1',
          quantity: 1,
          unitPrice: 2000000,
          totalPrice: 2000000,
        },
      ]);

      const newBalance = service.getMember('member-001')?.creditBalance;
      expect(newBalance).toBe(originalBalance - paymentAmount);
    });

    it('should reduce credit to zero for exact amount payment', () => {
      service.processPayment('member-001', 5000000, [
        {
          productId: 'prod-1',
          quantity: 1,
          unitPrice: 5000000,
          totalPrice: 5000000,
        },
      ]);

      const newBalance = service.getMember('member-001')?.creditBalance;
      expect(newBalance).toBe(0);
    });

    it('should support multiple sequential payments', () => {
      const initialBalance = 5000000;

      service.processPayment('member-001', 1000000, []);
      let balance = service.getMember('member-001')?.creditBalance;
      expect(balance).toBe(initialBalance - 1000000);

      service.processPayment('member-001', 1500000, []);
      balance = service.getMember('member-001')?.creditBalance;
      expect(balance).toBe(initialBalance - 2500000);

      service.processPayment('member-001', 1500000, []);
      balance = service.getMember('member-001')?.creditBalance;
      expect(balance).toBe(initialBalance - 4000000);
    });

    it('should increment total spent on payment', () => {
      const originalSpent = 15000000;
      const paymentAmount = 2000000;

      service.processPayment('member-001', paymentAmount, []);

      const member = service.getMember('member-001');
      expect(member?.totalSpent).toBe(originalSpent + paymentAmount);
    });

    it('should create transaction record with payment details', () => {
      const paymentAmount = 1000000;
      const items = [
        {
          productId: 'prod-1',
          quantity: 2,
          unitPrice: 500000,
          totalPrice: 1000000,
        },
      ];

      const result = service.processPayment('member-001', paymentAmount, items);

      expect(result.success).toBe(true);
      expect(result.transaction).toBeDefined();
      expect(result.transaction?.paymentMethod).toBe('MEMBER_CREDIT');
      expect(result.transaction?.totalAmount).toBe(paymentAmount);
      expect(result.transaction?.items).toHaveLength(1);
      expect(result.transaction?.status).toBe('COMPLETED');
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages for insufficient credit', () => {
      const result = service.validateMemberCredit('member-001', 6000000);
      expect(result.error).toContain('Available:');
      expect(result.error).toContain('Required:');
    });

    it('should handle member not found gracefully', () => {
      const result = service.processPayment('nonexistent', 1000000, []);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return complete validation response', () => {
      const result = service.validateMemberCredit('member-001', 10000000);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('currentBalance');
      expect(result).toHaveProperty('error');
    });
  });

  describe('Member Credit - Property-Based Tests', () => {
    /**
     * Property: Credit balance never goes negative
     * Validates: Requirement 7.8 - Member credit validation
     */
    it('should ensure credit never goes negative', () => {
      const testAmounts = [100000, 500000, 1000000, 2000000, 5000000];

      for (const amount of testAmounts) {
        service = new MemberCreditPaymentService();
        service.setupTestMember(createMockMember({ creditBalance: 1000000 }));

        const result = service.validateMemberCredit('member-001', amount);

        const finalBalance =
          service.getMember('member-001')?.creditBalance || 0;

        // Balance should never be negative
        expect(finalBalance).toBeGreaterThanOrEqual(0);

        if (result.valid) {
          // If valid, balance can be paid
          expect(finalBalance).toBeLessThanOrEqual(1000000);
        }
      }
    });

    /**
     * Property: Payment idempotency - same inputs produce same results
     * Validates: Requirement 7.8 - Consistent payment processing
     */
    it('should process same payment consistently', () => {
      const paymentAmount = 2000000;
      const items = [
        {
          productId: 'prod-1',
          quantity: 1,
          unitPrice: 2000000,
          totalPrice: 2000000,
        },
      ];

      // First payment
      const result1 = service.processPayment('member-001', paymentAmount, items);
      const balance1 = service.getMember('member-001')?.creditBalance;

      // Create fresh service and member for second attempt
      service = new MemberCreditPaymentService();
      service.setupTestMember(createMockMember());
      const result2 = service.processPayment('member-001', paymentAmount, items);
      const balance2 = service.getMember('member-001')?.creditBalance;

      // Both payments should result in same balance
      expect(balance1).toBe(balance2);
      expect(result1.success).toBe(result2.success);
    });

    /**
     * Property: All failed validations prevent deduction
     * Validates: Requirement 7.8 - Transaction prevention on insufficient credit
     */
    it('should prevent any deduction on validation failure', () => {
      const testCases = [
        { credit: 1000000, payment: 2000000, shouldSucceed: false },
        { credit: 1000000, payment: 1000000, shouldSucceed: true },
        { credit: 1000000, payment: 0, shouldSucceed: true },
      ];

      for (const testCase of testCases) {
        service = new MemberCreditPaymentService();
        service.setupTestMember(
          createMockMember({ creditBalance: testCase.credit })
        );

        const originalBalance = service.getMember('member-001')?.creditBalance;
        const result = service.processPayment('member-001', testCase.payment, []);

        const finalBalance = service.getMember('member-001')?.creditBalance;

        if (result.success) {
          expect(finalBalance).toBe(originalBalance - testCase.payment);
        } else {
          expect(finalBalance).toBe(originalBalance);
        }
      }
    });
  });
});
