/**
 * Error handling and user feedback utility
 * Manages error display and user notifications
 */

import { AppError } from '../types/ui-types';

export class ErrorHandler {
  private readonly errorContainer: HTMLElement;
  private readonly errorText: HTMLElement;
  private readonly errorClose: HTMLElement;
  private currentTimeout: number | null = null;
  private readonly boundHideError: (event: Event) => void;

  constructor() {
    this.errorContainer = this.getRequiredElement('#error-container');
    this.errorText = this.getRequiredElement('.error-text');
    this.errorClose = this.getRequiredElement('.error-close');
    this.boundHideError = this.hideError.bind(this);

    this.setupEventListeners();
  }

  /**
   * Set up event listeners for error handling
   */
  private setupEventListeners(): void {
    this.errorClose.addEventListener('click', this.boundHideError);

    // Hide error when clicking outside
    this.errorContainer.addEventListener('click', (event: Event) => {
      if (event.target === this.errorContainer) {
        this.hideError();
      }
    });
  }

  /**
   * Display an error message to the user
   */
  public showError(error: AppError | string): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorType = typeof error === 'string' ? 'unknown' : error.type;

    // Clear any existing timeout
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    // Update error content
    this.errorText.textContent = errorMessage;

    // Add error type class for styling
    this.errorContainer.className = `error-container error-${errorType}`;

    // Show error container
    this.errorContainer.classList.remove('hidden');

    // Auto-hide after 10 seconds for non-critical errors
    if (errorType !== 'validation') {
      this.currentTimeout = window.setTimeout(() => {
        this.hideError();
      }, 10000);
    }

    // Log error for debugging
    console.error('ErrorHandler:', error);
  }

  /**
   * Hide the error message
   */
  public hideError(): void {
    this.errorContainer.classList.add('hidden');

    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
  }

  /**
   * Show a success message
   */
  public showSuccess(message: string): void {
    // For now, just log success messages
    // Could be extended to show success notifications
    console.log('Success:', message);
  }

  /**
   * Show a loading message
   */
  public showLoading(message: string): void {
    // For now, just log loading messages
    // Could be extended to show loading indicators
    console.log('Loading:', message);
  }

  /**
   * Create a user-friendly error message based on error type
   */
  public createUserFriendlyError(error: unknown): AppError {
    if (error instanceof Error) {
      // Check for specific error patterns
      if (error.message.includes('fetch')) {
        return {
          type: 'network',
          message:
            'Failed to load workflow. Please check your connection and try again.',
          details: error.message,
        };
      }

      if (error.message.includes('YAML') || error.message.includes('parsing')) {
        return {
          type: 'parsing',
          message: 'Invalid YAML format. Please check your workflow file.',
          details: error.message,
        };
      }

      if (error.message.includes('validation')) {
        return {
          type: 'validation',
          message: error.message,
          details: error.message,
        };
      }

      return {
        type: 'unknown',
        message: error.message || 'An unexpected error occurred.',
        details: error.message,
      };
    }

    return {
      type: 'unknown',
      message: 'An unexpected error occurred.',
      details: String(error),
    };
  }

  /**
   * Get a required DOM element with error handling
   */
  private getRequiredElement(selector: string): HTMLElement {
    const element = document.querySelector(selector) as HTMLElement;

    if (!element) {
      throw new Error(`Required element not found: ${selector}`);
    }

    return element;
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    this.errorClose.removeEventListener('click', this.boundHideError);

    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
  }
}
