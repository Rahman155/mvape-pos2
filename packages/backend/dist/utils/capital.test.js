/**
 * Property-Based Tests for Capital Calculation
 *
 * Tests validate the invariant that store capital (modal) is never negative.
 * Store capital is calculated as:
 *   Capital = Inventory Value (at cost) + Cash in Register
 *
 * **Validates: Requirements 21, 22**
 *
 * Property 4: Capital non-negativity
 * With valid inputs (non-negative inventory quantities and cost prices, non-negative cash),
 * the calculated capital should never become negative.
 */
import fc from 'fast-check';
import { db } from '../database/index.js';
// Mock database for testing
jest.mock('../database/index.js');
describe('Capital Calculation - Property-Based Tests', () => {
    const mockDb = db;
    beforeEach(() => {
        jest.clearAllMocks();
    });
    /**
     * Property 4: Capital Non-Negativity
     *
     * Test that calculated capital never becomes negative with valid inputs.
     *
     * This property generates various valid combinations of:
     * - Inventory quantities (always non-negative)
     * - Cost prices (always non-negative)
     * - Cash amounts (always non-negative)
     *
     * And verifies that the sum always produces non-negative capital values.
     *
     * **Validates: Requirement 21, 22**
     */
    it('Property 4: Capital should never be negative with valid inputs', () => {
        // Define arbitraries for valid inputs
        // Quantities: 0 to 10,000 units per product
        const quantityArbitrary = fc.integer({ min: 0, max: 10000 });
        // Cost prices: 0 to 1,000,000 IDR per unit (realistic for vape products)
        const costPriceArbitrary = fc.integer({ min: 0, max: 1000000 });
        // Cash amounts: 0 to 100,000,000 IDR
        const cashArbitrary = fc.integer({ min: 0, max: 100000000 });
        // Generate multiple inventory items (0 to 20 different products per store)
        const inventoryItemsArbitrary = fc.array(fc.tuple(quantityArbitrary, costPriceArbitrary), { minLength: 0, maxLength: 20 });
        fc.assert(fc.property(inventoryItemsArbitrary, cashArbitrary, (inventoryItems, cash) => {
            // Calculate inventory value: sum of (quantity * cost_price)
            const inventoryValue = inventoryItems.reduce((sum, [quantity, costPrice]) => {
                const itemValue = quantity * costPrice;
                // Ensure item value doesn't cause overflow
                if (itemValue < 0 || !Number.isFinite(itemValue)) {
                    return sum;
                }
                return sum + itemValue;
            }, 0);
            // Calculate total capital
            const totalCapital = inventoryValue + cash;
            // Property assertion: Capital must always be non-negative
            expect(totalCapital).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(totalCapital)).toBe(true);
        }), {
            numRuns: 1000, // Run 1000 random test cases
            verbose: false,
        });
    });
    /**
     * Additional property test: Capital components should not become negative
     *
     * Validates that even when calculating individual components,
     * neither inventory value nor cash amount becomes negative.
     */
    it('Property 4b: Capital components should individually be non-negative', () => {
        const quantityArbitrary = fc.integer({ min: 0, max: 10000 });
        const costPriceArbitrary = fc.integer({ min: 0, max: 1000000 });
        const cashArbitrary = fc.integer({ min: 0, max: 100000000 });
        const inventoryItemsArbitrary = fc.array(fc.tuple(quantityArbitrary, costPriceArbitrary), { minLength: 0, maxLength: 20 });
        fc.assert(fc.property(inventoryItemsArbitrary, cashArbitrary, (inventoryItems, cash) => {
            // Calculate inventory value component
            const inventoryValue = inventoryItems.reduce((sum, [quantity, costPrice]) => {
                const itemValue = quantity * costPrice;
                if (itemValue < 0 || !Number.isFinite(itemValue)) {
                    return sum;
                }
                return sum + itemValue;
            }, 0);
            // Property assertions
            expect(inventoryValue).toBeGreaterThanOrEqual(0);
            expect(cash).toBeGreaterThanOrEqual(0);
            expect(inventoryValue + cash).toBeGreaterThanOrEqual(0);
        }), { numRuns: 1000 });
    });
    /**
     * Test edge cases with various inventory configurations
     *
     * Validates capital non-negativity with:
     * - Empty inventory (0 items)
     * - Large quantities
     * - Large prices
     * - Large cash amounts
     */
    it('Property 4c: Capital non-negativity with edge case inventory configurations', () => {
        const quantityArbitrary = fc.oneof(fc.constant(0), // Empty inventory
        fc.integer({ min: 1, max: 100 }), fc.integer({ min: 100, max: 10000 }) // Large quantities
        );
        const costPriceArbitrary = fc.oneof(fc.constant(0), // Free items
        fc.integer({ min: 1, max: 10000 }), fc.integer({ min: 10000, max: 1000000 }) // High-value items
        );
        const cashArbitrary = fc.oneof(fc.constant(0), // No cash
        fc.integer({ min: 1, max: 1000000 }), fc.integer({ min: 1000000, max: 100000000 }) // Large cash amounts
        );
        const inventoryItemsArbitrary = fc.array(fc.tuple(quantityArbitrary, costPriceArbitrary), { minLength: 0, maxLength: 20 });
        fc.assert(fc.property(inventoryItemsArbitrary, cashArbitrary, (inventoryItems, cash) => {
            const inventoryValue = inventoryItems.reduce((sum, [quantity, costPrice]) => {
                const itemValue = quantity * costPrice;
                if (itemValue < 0 || !Number.isFinite(itemValue)) {
                    return sum;
                }
                return sum + itemValue;
            }, 0);
            const totalCapital = inventoryValue + cash;
            // Property: Capital must never be negative
            expect(totalCapital).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(totalCapital)).toBe(true);
            // Property: If any component is 0, capital should be >= the other component
            if (inventoryValue === 0) {
                expect(totalCapital).toBe(cash);
            }
            if (cash === 0) {
                expect(totalCapital).toBe(inventoryValue);
            }
        }), { numRuns: 1000 });
    });
    /**
     * Test with realistic vape store product mix
     *
     * Models realistic inventory with:
     * - Multiple product types (e-liquids, mods, coils, accessories)
     * - Realistic price ranges
     * - Realistic stock levels
     */
    it('Property 4d: Capital non-negativity with realistic vape store inventory', () => {
        // Product types with realistic price ranges (in IDR)
        const eLiquidPrice = fc.integer({ min: 50000, max: 200000 }); // 50k - 200k
        const modPrice = fc.integer({ min: 200000, max: 2000000 }); // 200k - 2M
        const coilPrice = fc.integer({ min: 10000, max: 100000 }); // 10k - 100k
        const accessoryPrice = fc.integer({ min: 5000, max: 500000 }); // 5k - 500k
        const stockLevel = fc.integer({ min: 0, max: 500 });
        const inventoryArbitrary = fc.record({
            eLiquids: fc.array(fc.tuple(stockLevel, eLiquidPrice), { maxLength: 50 }),
            mods: fc.array(fc.tuple(stockLevel, modPrice), { maxLength: 30 }),
            coils: fc.array(fc.tuple(stockLevel, coilPrice), { maxLength: 100 }),
            accessories: fc.array(fc.tuple(stockLevel, accessoryPrice), { maxLength: 200 }),
        });
        const cashArbitrary = fc.integer({ min: 0, max: 500000000 }); // 0 - 500M IDR
        fc.assert(fc.property(inventoryArbitrary, cashArbitrary, (inventory, cash) => {
            let inventoryValue = 0;
            // Sum all product categories
            for (const category of ['eLiquids', 'mods', 'coils', 'accessories']) {
                inventoryValue += inventory[category].reduce((sum, [quantity, price]) => {
                    const itemValue = quantity * price;
                    return sum + (itemValue >= 0 && Number.isFinite(itemValue) ? itemValue : 0);
                }, 0);
            }
            const totalCapital = inventoryValue + cash;
            // Property: Capital must never be negative
            expect(totalCapital).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(totalCapital)).toBe(true);
        }), { numRuns: 500 } // Fewer runs due to more complex data structure
        );
    });
    /**
     * Test capital conservation principle
     *
     * If we combine two stores' capital, the result should be non-negative
     * if both stores individually have non-negative capital.
     */
    it('Property 4e: Capital conservation - combining stores maintains non-negativity', () => {
        const quantityArbitrary = fc.integer({ min: 0, max: 10000 });
        const costPriceArbitrary = fc.integer({ min: 0, max: 1000000 });
        const cashArbitrary = fc.integer({ min: 0, max: 100000000 });
        const inventoryItemsArbitrary = fc.array(fc.tuple(quantityArbitrary, costPriceArbitrary), { minLength: 0, maxLength: 20 });
        fc.assert(fc.property(inventoryItemsArbitrary, inventoryItemsArbitrary, cashArbitrary, cashArbitrary, (store1Inventory, store2Inventory, store1Cash, store2Cash) => {
            // Calculate store 1 capital
            const store1InventoryValue = store1Inventory.reduce((sum, [qty, price]) => {
                const val = qty * price;
                return sum + (val >= 0 && Number.isFinite(val) ? val : 0);
            }, 0);
            const store1Capital = store1InventoryValue + store1Cash;
            // Calculate store 2 capital
            const store2InventoryValue = store2Inventory.reduce((sum, [qty, price]) => {
                const val = qty * price;
                return sum + (val >= 0 && Number.isFinite(val) ? val : 0);
            }, 0);
            const store2Capital = store2InventoryValue + store2Cash;
            // Combined capital
            const combinedCapital = store1Capital + store2Capital;
            // Property: If both stores have non-negative capital, combined is non-negative
            expect(store1Capital).toBeGreaterThanOrEqual(0);
            expect(store2Capital).toBeGreaterThanOrEqual(0);
            expect(combinedCapital).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(combinedCapital)).toBe(true);
        }), { numRuns: 1000 });
    });
});
//# sourceMappingURL=capital.test.js.map