/**
 * DOM manipulation utility functions
 * Provides helper functions for common DOM operations
 */

/**
 * Get a required DOM element with type safety
 */
export function getRequiredElement<T extends HTMLElement>(
  selector: string,
  context: Document | HTMLElement = document
): T {
  const element = context.querySelector(selector) as T;

  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }

  return element;
}

/**
 * Get an optional DOM element with type safety
 */
export function getOptionalElement<T extends HTMLElement>(
  selector: string,
  context: Document | HTMLElement = document
): T | null {
  return context.querySelector(selector) as T | null;
}

/**
 * Get all elements matching a selector with type safety
 */
export function getAllElements<T extends HTMLElement>(
  selector: string,
  context: Document | HTMLElement = document
): T[] {
  return Array.from(context.querySelectorAll(selector)) as T[];
}

/**
 * Create an element with attributes and content
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes: Record<string, string> = {},
  textContent?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  // Set attributes
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }

  // Set text content if provided
  if (textContent !== undefined) {
    element.textContent = textContent;
  }

  return element;
}

/**
 * Add CSS classes to an element
 */
export function addClasses(
  element: HTMLElement,
  ...classNames: string[]
): void {
  element.classList.add(...classNames);
}

/**
 * Remove CSS classes from an element
 */
export function removeClasses(
  element: HTMLElement,
  ...classNames: string[]
): void {
  element.classList.remove(...classNames);
}

/**
 * Toggle CSS classes on an element
 */
export function toggleClasses(
  element: HTMLElement,
  ...classNames: string[]
): void {
  for (const className of classNames) {
    element.classList.toggle(className);
  }
}

/**
 * Check if element has a CSS class
 */
export function hasClass(element: HTMLElement, className: string): boolean {
  return element.classList.contains(className);
}

/**
 * Set multiple CSS styles on an element
 */
export function setStyles(
  element: HTMLElement,
  styles: Record<string, string>
): void {
  for (const [property, value] of Object.entries(styles)) {
    element.style.setProperty(property, value);
  }
}

/**
 * Clear all children from an element
 */
export function clearChildren(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Append multiple children to an element
 */
export function appendChildren(
  parent: HTMLElement,
  ...children: HTMLElement[]
): void {
  for (const child of children) {
    parent.appendChild(child);
  }
}

/**
 * Show an element by removing 'hidden' class
 */
export function showElement(element: HTMLElement): void {
  element.classList.remove('hidden');
  element.style.display = '';
}

/**
 * Hide an element by adding 'hidden' class
 */
export function hideElement(element: HTMLElement): void {
  element.classList.add('hidden');
}

/**
 * Check if an element is visible
 */
export function isElementVisible(element: HTMLElement): boolean {
  return (
    !element.classList.contains('hidden') &&
    element.style.display !== 'none' &&
    element.offsetParent !== null
  );
}

/**
 * Safely set innerHTML with basic XSS protection
 */
export function setSafeInnerHTML(element: HTMLElement, html: string): void {
  // Basic sanitization - remove script tags and event handlers
  const sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');

  element.innerHTML = sanitized;
}

/**
 * Debounce a function call
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle a function call
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}
