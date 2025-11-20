# UI Testing Checklist

## Manual QA Steps

1. **Accessibility - Keyboard Navigation**
   - [ ] Tab through all interactive elements (file input, buttons, copy button)
   - [ ] Verify focus rings are visible on all focusable elements
   - [ ] Press Enter on file input to trigger file picker
   - [ ] Verify screen reader announces status messages (use VoiceOver/NVDA)

2. **Responsive Layout**
   - [ ] Resize browser to mobile width (< 640px) - verify columns stack vertically
   - [ ] Test at tablet width (768px) - verify layout adapts smoothly
   - [ ] Test at desktop width (1024px+) - verify two-column grid displays
   - [ ] Verify all text is readable and buttons are tappable on mobile

3. **Visual Hierarchy**
   - [ ] Confirm header gradient displays correctly
   - [ ] Verify preview card has `shadow-lg` and minimum 360px height
   - [ ] Check that canvas scales properly on different image sizes
   - [ ] Verify Copy button is visible in top-right of result card

4. **Button Functionality**
   - [ ] Upload an image and click "Standard OCR" - verify button styling
   - [ ] Click "Deep Scan (AI)" - verify spinner appears and primary button style
   - [ ] Trigger an error to see "Retry with Fallback" - verify yellow button appears
   - [ ] Verify all buttons disable during processing state

5. **Status & Progress**
   - [ ] Verify progress bar appears at top when processing
   - [ ] Confirm status messages display in alert box with icon
   - [ ] Check that aria-live regions announce changes for screen readers
   - [ ] Verify helper text appears under upload section

6. **Result Display**
   - [ ] Upload and scan an image - verify text appears in textarea
   - [ ] Click Copy button - verify text copies to clipboard
   - [ ] Verify character count updates in footer
   - [ ] Check placeholder state when no results ("Abc" graphic displays)
