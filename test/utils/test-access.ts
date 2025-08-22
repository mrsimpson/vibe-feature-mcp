/**
 * Test Access Utilities
 *
 * Clean utilities for accessing private methods and properties in tests
 * without using @ts-ignore or unsafe type assertions.
 *
 * Note: Uses 'any' types intentionally for test utilities to access private members
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Safely access a private property for testing purposes
 * @param instance - The class instance
 * @param propertyName - The name of the private property
 * @returns The property value
 */
export function getPrivateProperty<T, K extends keyof T>(
  instance: T,
  propertyName: K
): T[K] {
  return (instance as any)[propertyName];
}

/**
 * Safely set a private property for testing purposes (e.g., injecting mocks)
 * @param instance - The class instance
 * @param propertyName - The name of the private property
 * @param value - The value to set
 */
export function setPrivateProperty<T, K extends keyof T>(
  instance: T,
  propertyName: K,
  value: T[K]
): void {
  (instance as any)[propertyName] = value;
}

/**
 * Safely call a private method for testing purposes
 * @param instance - The class instance
 * @param methodName - The name of the private method
 * @param args - Arguments to pass to the method
 * @returns The method return value
 */
export function callPrivateMethod<T>(
  instance: T,
  methodName: string,
  ...args: unknown[]
): unknown {
  return (instance as any)[methodName](...args);
}

/**
 * Type-safe helper specifically for common test scenarios
 */
export class TestAccess {
  /**
   * Inject a mock dependency into a private property
   */
  static injectMock<T>(
    instance: T,
    propertyName: string,
    mockValue: unknown
  ): void {
    setPrivateProperty(instance, propertyName as keyof T, mockValue);
  }

  /**
   * Call a private method with proper typing
   */
  static callMethod<T>(
    instance: T,
    methodName: string,
    ...args: unknown[]
  ): unknown {
    return callPrivateMethod(instance, methodName, ...args);
  }
}
