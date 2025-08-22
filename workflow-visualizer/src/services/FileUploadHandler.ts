/**
 * File upload handling service
 * Manages file upload UI interactions and validation
 */

import { YamlStateMachine, AppError } from '../types/ui-types';
import { WorkflowLoader } from './WorkflowLoader';

export class FileUploadHandler {
  private readonly workflowLoader: WorkflowLoader;
  private readonly fileInput: HTMLInputElement;
  private readonly boundHandleFileSelection: (event: Event) => void;

  constructor(
    fileInputElement: HTMLInputElement,
    workflowLoader: WorkflowLoader
  ) {
    this.workflowLoader = workflowLoader;
    this.fileInput = fileInputElement;
    this.boundHandleFileSelection = this.handleFileSelection.bind(this);
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for file upload
   */
  private setupEventListeners(): void {
    this.fileInput.addEventListener('change', this.boundHandleFileSelection);
  }

  /**
   * Handle file selection from input
   */
  private async handleFileSelection(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];

    try {
      const workflow = await this.processUploadedFile(file);
      this.onWorkflowLoaded(workflow, file.name);
    } catch (error) {
      this.onUploadError(error as AppError);
    } finally {
      // Clear the input so the same file can be uploaded again
      target.value = '';
    }
  }

  /**
   * Process an uploaded file and return the parsed workflow
   */
  public async processUploadedFile(file: File): Promise<YamlStateMachine> {
    console.log(`Processing uploaded file: ${file.name} (${file.size} bytes)`);

    try {
      const workflow = await this.workflowLoader.loadUploadedWorkflow(file);
      console.log(`Successfully processed uploaded workflow: ${workflow.name}`);
      return workflow;
    } catch (error) {
      console.error(`Error processing uploaded file:`, error);
      // Re-throw with additional context
      if (error instanceof Error) {
        throw this.createUploadError(`Upload failed: ${error.message}`);
      }
      throw this.createUploadError(`Upload failed: ${String(error)}`);
    }
  }

  /**
   * Validate file before processing
   */
  public validateFile(file: File): void {
    // Check file type
    if (!this.isValidFileType(file)) {
      throw this.createUploadError(
        'Invalid file type. Please select a .yaml or .yml file.'
      );
    }

    // Check file size (1MB limit)
    const maxSizeBytes = 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw this.createUploadError(
        `File too large. Maximum size is ${maxSizeBytes / 1024 / 1024}MB.`
      );
    }

    // Check if file is empty
    if (file.size === 0) {
      throw this.createUploadError('File is empty.');
    }
  }

  /**
   * Check if file type is valid
   */
  private isValidFileType(file: File): boolean {
    const validExtensions = ['.yaml', '.yml'];
    const fileName = file.name.toLowerCase();

    return validExtensions.some(ext => fileName.endsWith(ext));
  }

  /**
   * Handle successful workflow loading
   * This method should be overridden by the consumer
   */
  public onWorkflowLoaded: (
    workflow: YamlStateMachine,
    fileName: string
  ) => void = () => {
    console.log('FileUploadHandler: onWorkflowLoaded not implemented');
  };

  /**
   * Handle upload errors
   * This method should be overridden by the consumer
   */
  public onUploadError: (error: AppError) => void = () => {
    console.error('FileUploadHandler: onUploadError not implemented');
  };

  /**
   * Programmatically trigger file selection dialog
   */
  public triggerFileSelection(): void {
    this.fileInput.click();
  }

  /**
   * Get the current file input element
   */
  public getFileInput(): HTMLInputElement {
    return this.fileInput;
  }

  /**
   * Reset the file input
   */
  public resetFileInput(): void {
    this.fileInput.value = '';
  }

  /**
   * Create an upload error
   */
  private createUploadError(message: string): AppError {
    return {
      type: 'validation',
      message: message,
    } as AppError;
  }

  /**
   * Destroy the handler and clean up event listeners
   */
  public destroy(): void {
    this.fileInput.removeEventListener('change', this.boundHandleFileSelection);
  }
}
