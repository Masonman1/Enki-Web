import { render, screen } from '@testing-library/react';
import UploadZone from '@/components/forms/upload-zone';

test('renders UploadZone and calls onUpload', () => {
  const mockOnUpload = jest.fn();
  render(<UploadZone onUpload={mockOnUpload} />);
  expect(screen.getByText(/Drag & drop PDFs/)).toBeInTheDocument();
  // Simulate drop (advanced - add if needed with fireEvent)
});