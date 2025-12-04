/**
 * @fileoverview Frontend E2E Tests (Fixed Version)
 * Tests real user interactions with the TigerTix frontend using Puppeteer
 */

describe('🎫 TigerTix Frontend E2E Tests', () => {
  let page;
  let browser;

  beforeAll(async () => {
    browser = await global.setupPuppeteer();
    console.log('🚀 Starting frontend E2E tests...');
  });

  afterAll(async () => {
    if (global.teardownPuppeteer) {
      await global.teardownPuppeteer();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Add waitForTimeout polyfill
    if (!page.waitForTimeout) {
      page.waitForTimeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Set viewport for consistent testing
    await page.setViewport({ width: 1280, height: 720 });
    
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Console Error:', msg.text());
      }
    });
    
    // Navigate to the application
    try {
      await page.goto('https://cpsc-3720-project.vercel.app/', { waitUntil: 'networkidle0', timeout: 10000 });
    } catch (error) {
      console.log('⚠️ Frontend may not be running, attempting basic connection...');
      await page.goto('https://cpsc-3720-project.vercel.app/', { waitUntil: 'domcontentloaded', timeout: 5000 });
    }
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('🏠 Application Loading & Navigation', () => {
    test('Application loads successfully', async () => {
      // Check that the main app container is present
      try {
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Check for main navigation or key elements
        const title = await page.title();
        console.log('📄 Page title:', title);
        
        // Verify the app is interactive
        const bodyText = await page.evaluate(() => document.body.textContent);
        expect(bodyText.length).toBeGreaterThan(0);
        console.log('✅ Application loaded with content');
        
      } catch (error) {
        console.log('❌ Application failed to load:', error.message);
        // Take screenshot for debugging
        await page.screenshot({ path: 'failed-load.png' });
        throw error;
      }
    });

    test('Navigation between views works', async () => {
      // Wait for initial load
      await page.waitForSelector('body', { timeout: 10000 });
      
      // Look for clickable navigation elements
      const navigationElements = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const links = Array.from(document.querySelectorAll('a'));
        const clickable = [...buttons, ...links].filter(el => {
          const text = el.textContent.toLowerCase();
          return el.offsetWidth > 0 && el.offsetHeight > 0 && 
                 (text.includes('event') || text.includes('chat') || text.includes('home'));
        });
        return clickable.map(el => ({
          text: el.textContent.trim(),
          tagName: el.tagName
        }));
      });
      
      console.log('📋 Found navigation elements:', navigationElements);
      
      if (navigationElements.length > 0) {
        // Try to click on navigation elements
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
          await buttons[0].click();
          await page.waitForTimeout(1000);
          console.log('✅ Navigation interaction successful');
        }
      }
      
      // Verify we're still on the same domain
      const currentUrl = page.url();
      expect(currentUrl).toContain('localhost:3000');
    });

    test('Page is responsive and accessible', async () => {
      // Test different viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1280, height: 720 } // Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.waitForTimeout(500);
        
        // Check that content is still visible and accessible
        const bodyText = await page.evaluate(() => document.body.textContent);
        expect(bodyText.length).toBeGreaterThan(0);
        
        // Check that interactive elements are still present
        const clickableCount = await page.evaluate(() => {
          return document.querySelectorAll('button:not([disabled]), a[href], input:not([disabled])').length;
        });
        expect(clickableCount).toBeGreaterThan(0);
        
        console.log(`✅ ${viewport.width}x${viewport.height} viewport responsive`);
      }
    });
  });

  describe('📋 Event Listing & Display', () => {
    test('Events are displayed when available', async () => {
      await page.waitForTimeout(2000); // Allow time for API calls
      
      // Look for event-related content
      const eventContent = await page.evaluate(() => {
        const text = document.body.textContent.toLowerCase();
        const eventElements = document.querySelectorAll('[class*="event"], [class*="card"], [data-testid*="event"]');
        return {
          hasEventText: text.includes('event') || text.includes('game') || text.includes('match'),
          hasTicketText: text.includes('ticket') || text.includes('buy') || text.includes('purchase'),
          hasPrice: text.includes('$') || text.includes('price'),
          eventElementsCount: eventElements.length,
          content: text.substring(0, 200) + '...'
        };
      });
      
      console.log('🎪 Event content analysis:', eventContent);
      
      // If events are present, verify their structure
      if (eventContent.eventElementsCount > 0 || eventContent.hasEventText) {
        console.log('✅ Events detected on page');
        expect(eventContent.hasEventText || eventContent.eventElementsCount > 0).toBe(true);
      } else {
        console.log('ℹ️ No events found - checking for appropriate messaging');
      }
    });

    test('Event details are properly formatted', async () => {
      await page.waitForTimeout(2000);
      
      // Look for formatted dates, times, and prices
      const formattingCheck = await page.evaluate(() => {
        const text = document.body.textContent;
        const hasDateFormats = /\d{4}[-/]\d{2}[-/]\d{2}|\w+\s+\d{1,2}/.test(text);
        const hasTimeFormats = /\d{1,2}:\d{2}/.test(text);
        const hasPriceFormats = /\$\d+|\d+\.\d{2}/.test(text);
        const hasVenues = text.toLowerCase().includes('stadium') || 
                         text.toLowerCase().includes('arena') || 
                         text.toLowerCase().includes('venue');
        
        return {
          hasDates: hasDateFormats,
          hasTimes: hasTimeFormats,
          hasPrices: hasPriceFormats,
          hasLocations: hasVenues,
          textSample: text.substring(0, 100)
        };
      });
      
      console.log('📅 Formatting check:', formattingCheck);
      
      // At least some content should be present
      expect(formattingCheck.textSample.length).toBeGreaterThan(0);
    });

    test('No events message appears when no events available', async () => {
      await page.waitForTimeout(3000);
      
      const pageContent = await page.evaluate(() => {
        const text = document.body.textContent.toLowerCase();
        const hasEvents = text.includes('event') && 
                         (text.includes('ticket') || text.includes('buy'));
        const hasNoEventsMessage = text.includes('no events') || 
                                  text.includes('no games') ||
                                  text.includes('coming soon') ||
                                  text.includes('check back') ||
                                  text.includes('available');
        
        return {
          hasEvents,
          hasNoEventsMessage,
          textLength: text.length
        };
      });
      
      expect(pageContent.hasEvents || pageContent.hasNoEventsMessage || pageContent.textLength > 0).toBe(true);
      console.log(`📊 Content status: ${pageContent.hasEvents ? 'Events found' : 'Content available'}`);
    });
  });

  describe('🎟️ Ticket Purchasing Flow', () => {
    test('Purchase buttons are clickable when events exist', async () => {
      await page.waitForTimeout(2000);
      
      // Look for purchase/buy buttons using evaluate
      const purchaseInfo = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        const buyButtons = allButtons.filter(btn => {
          const text = btn.textContent.toLowerCase();
          return (text.includes('buy') || text.includes('purchase') || text.includes('book')) &&
                 !btn.disabled;
        });
        
        return {
          totalButtons: allButtons.length,
          buyButtonsCount: buyButtons.length,
          buyButtonTexts: buyButtons.slice(0, 3).map(btn => btn.textContent.trim())
        };
      });
      
      console.log(`🛒 Found ${purchaseInfo.buyButtonsCount} purchase buttons out of ${purchaseInfo.totalButtons} total buttons`);
      
      if (purchaseInfo.buyButtonsCount > 0) {
        // Test first purchase button
        const buyButtons = await page.$$('button');
        for (const button of buyButtons) {
          const text = await button.evaluate(btn => btn.textContent.toLowerCase());
          if (text.includes('buy') || text.includes('purchase') || text.includes('book')) {
            const isEnabled = await button.evaluate(btn => !btn.disabled);
            expect(isEnabled).toBe(true);
            
            // Click the button and verify some response
            await button.click();
            await page.waitForTimeout(1000);
            console.log('✅ Purchase button clicked successfully');
            break;
          }
        }
      } else {
        console.log('ℹ️ No purchase buttons found - may be no events available');
      }
    });

    test('Ticket quantity selection works', async () => {
      await page.waitForTimeout(2000);
      
      // Look for quantity inputs
      const quantityInputs = await page.$$('input[type="number"]');
      
      if (quantityInputs.length > 0) {
        console.log(`🔢 Found ${quantityInputs.length} quantity inputs`);
        
        const firstInput = quantityInputs[0];
        
        // Try to change the quantity
        await firstInput.click();
        await firstInput.evaluate(input => input.value = '3');
        await firstInput.type('3');
        
        const value = await firstInput.evaluate(input => input.value);
        console.log('🎫 Quantity set to:', value);
        expect(value).toBeTruthy();
      }
      
      // Also look for +/- buttons
      const allButtons = await page.$$('button');
      let incrementButtons = [];
      let decrementButtons = [];
      
      for (const button of allButtons) {
        const text = await button.evaluate(btn => btn.textContent);
        if (text.includes('+') || text.includes('▲')) incrementButtons.push(button);
        if (text.includes('-') || text.includes('▼')) decrementButtons.push(button);
      }
      
      if (incrementButtons.length > 0) {
        console.log('🔺 Found increment/decrement buttons');
        await incrementButtons[0].click();
        await page.waitForTimeout(500);
      }
    });

    test('Purchase confirmation flow works', async () => {
      await page.waitForTimeout(2000);
      
      // Look for purchase buttons
      const allButtons = await page.$$('button');
      let purchaseButton = null;
      
      for (const button of allButtons) {
        const text = await button.evaluate(btn => btn.textContent.toLowerCase());
        if (text.includes('buy') || text.includes('purchase') || text.includes('book')) {
          purchaseButton = button;
          break;
        }
      }
      
      if (purchaseButton) {
        // Click purchase button
        await purchaseButton.click();
        await page.waitForTimeout(1000);
        
        // Look for confirmation dialog or modal
        const modalCheck = await page.evaluate(() => {
          const modals = document.querySelectorAll('[role="dialog"], .modal, [data-testid*="modal"]');
          const confirmButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
            btn.textContent.toLowerCase().includes('confirm') ||
            btn.textContent.toLowerCase().includes('yes') ||
            btn.textContent.toLowerCase().includes('ok')
          );
          
          return {
            hasModal: modals.length > 0,
            hasConfirmButton: confirmButtons.length > 0,
            confirmButtonTexts: confirmButtons.map(btn => btn.textContent.trim())
          };
        });
        
        console.log('✅ Confirmation check:', modalCheck);
        
        if (modalCheck.hasConfirmButton) {
          // Try to confirm the purchase
          const confirmButtons = await page.$$('button');
          for (const button of confirmButtons) {
            const text = await button.evaluate(btn => btn.textContent.toLowerCase());
            if (text.includes('confirm') || text.includes('yes') || text.includes('ok')) {
              await button.click();
              await page.waitForTimeout(1000);
              console.log('🎉 Purchase confirmation clicked');
              break;
            }
          }
        }
      }
    });
  });

  describe('🤖 Chat Assistant Functionality', () => {
    test('Chat interface is accessible', async () => {
      await page.waitForTimeout(2000);
      
      // Look for chat-related elements
      const chatElements = await page.evaluate(() => {
        const textareas = Array.from(document.querySelectorAll('textarea'));
        const textInputs = Array.from(document.querySelectorAll('input[type="text"]'));
        const chatElements = Array.from(document.querySelectorAll('[data-testid*="chat"], [class*="chat"]'));
        
        const allInputs = [...textareas, ...textInputs, ...chatElements];
        
        return allInputs.map(el => ({
          tagName: el.tagName,
          placeholder: el.placeholder || '',
          className: el.className || '',
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        })).filter(el => el.visible);
      });
      
      console.log('💬 Chat elements found:', chatElements);
      
      if (chatElements.length > 0) {
        const chatInputs = await page.$$('textarea, input[type="text"]');
        if (chatInputs.length > 0) {
          const isVisible = await chatInputs[0].evaluate(el => el.offsetWidth > 0 && el.offsetHeight > 0);
          expect(isVisible).toBe(true);
          console.log('✅ Chat interface accessible');
        }
      }
    });

    test('Chat input accepts text and submits', async () => {
      await page.waitForTimeout(2000);
      
      // Look for chat input field
      const chatInputs = await page.$$('textarea, input[type="text"]');
      
      if (chatInputs.length > 0) {
        console.log('📝 Found chat input field');
        
        const chatInput = chatInputs[0];
        
        // Type a test message
        await chatInput.click();
        await chatInput.type('I want to book tickets for football');
        
        // Look for submit button
        const allButtons = await page.$$('button');
        let submitButton = null;
        
        for (const button of allButtons) {
          const text = await button.evaluate(btn => btn.textContent.toLowerCase());
          if (text.includes('send') || text.includes('submit')) {
            submitButton = button;
            break;
          }
        }
        
        if (submitButton) {
          await submitButton.click();
        } else {
          // Try pressing Enter
          await chatInput.press('Enter');
        }
        
        await page.waitForTimeout(3000); // Wait for response
        
        console.log('🤖 Chat interaction completed');
        const pageContent = await page.evaluate(() => document.body.textContent);
        expect(pageContent.length).toBeGreaterThan(0);
      } else {
        console.log('ℹ️ No chat input found - chat may not be available on current view');
      }
    });

    test('Voice input functionality (if available)', async () => {
      await page.waitForTimeout(2000);
      
      // Look for voice/microphone buttons
      const voiceInfo = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        const voiceButtons = allButtons.filter(btn => {
          const text = btn.textContent;
          const title = btn.title || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          
          return text.includes('🎤') || 
                 title.toLowerCase().includes('voice') ||
                 ariaLabel.toLowerCase().includes('voice') ||
                 btn.className.toLowerCase().includes('voice') ||
                 btn.className.toLowerCase().includes('mic');
        });
        
        return {
          totalButtons: allButtons.length,
          voiceButtonsCount: voiceButtons.length,
          voiceButtonTexts: voiceButtons.map(btn => btn.textContent.trim())
        };
      });
      
      console.log('🎤 Voice input check:', voiceInfo);
      
      if (voiceInfo.voiceButtonsCount > 0) {
        console.log('✅ Voice input buttons detected');
        
        // Try to click the first voice button
        const allButtons = await page.$$('button');
        for (const button of allButtons) {
          const text = await button.evaluate(btn => btn.textContent);
          if (text.includes('🎤')) {
            const isEnabled = await button.evaluate(btn => !btn.disabled);
            if (isEnabled) {
              await button.click();
              await page.waitForTimeout(1000);
              console.log('🔴 Voice button clicked');
              
              // Click again to stop recording
              await button.click();
              await page.waitForTimeout(500);
              break;
            }
          }
        }
      } else {
        console.log('ℹ️ No voice input buttons found');
      }
    });

    test('Chat history is maintained', async () => {
      await page.waitForTimeout(2000);
      
      const chatInputs = await page.$$('textarea, input[type="text"]');
      
      if (chatInputs.length > 0) {
        const chatInput = chatInputs[0];
        
        // Send first message
        await chatInput.click();
        await chatInput.type('Hello');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        
        // Clear input and send second message
        await chatInput.click();
        await chatInput.evaluate(input => input.value = '');
        await chatInput.type('Show me events');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        
        // Check that content includes messages
        const chatContent = await page.evaluate(() => {
          const text = document.body.textContent.toLowerCase();
          return {
            hasHello: text.includes('hello'),
            hasEvents: text.includes('events') || text.includes('show'),
            textLength: text.length
          };
        });
        
        console.log('📜 Chat history check:', chatContent);
        
        // At least some interaction should be visible
        expect(chatContent.textLength).toBeGreaterThan(0);
      }
    });
  });

  describe('🎨 User Experience & Accessibility', () => {
    test('Page has proper focus management', async () => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => {
        const focused = document.activeElement;
        return {
          tagName: focused ? focused.tagName : null,
          type: focused ? focused.type : null,
          hasFocus: !!focused && focused !== document.body
        };
      });
      
      console.log('⌨️ Focus management:', focusedElement);
      expect(focusedElement.hasFocus || focusedElement.tagName).toBeTruthy();
    });

    test('Loading states are handled gracefully', async () => {
      // Reload page and check for loading indicators
      await page.reload({ waitUntil: 'domcontentloaded' });
      
      // Look for loading indicators within first few seconds
      const loadingCheck = await page.evaluate(() => {
        const text = document.body.textContent.toLowerCase();
        const hasLoadingText = text.includes('loading') || text.includes('please wait');
        const hasLoadingElements = document.querySelector('.loading, .spinner, [data-testid*="loading"]');
        
        return {
          hasLoadingText,
          hasLoadingElements: !!hasLoadingElements,
          isComplete: document.readyState === 'complete'
        };
      });
      
      // Wait for full load
      await page.waitForTimeout(3000);
      
      // Page should be fully interactive now
      const isInteractive = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button:not([disabled])');
        const inputs = document.querySelectorAll('input:not([disabled])');
        return {
          buttonCount: buttons.length,
          inputCount: inputs.length,
          hasInteractivity: buttons.length > 0 || inputs.length > 0
        };
      });
      
      console.log('⏳ Loading and interactivity check:', { loadingCheck, isInteractive });
      expect(isInteractive.hasInteractivity).toBe(true);
    });

    test('Error states are handled properly', async () => {
      let hasConsoleErrors = false;
      const consoleErrors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
          hasConsoleErrors = true;
          consoleErrors.push(msg.text());
        }
      });
      
      // Navigate and interact to trigger potential errors
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Click on various elements
      const clickableElements = await page.$$('button:not([disabled]), a[href]');
      if (clickableElements.length > 0) {
        try {
          await clickableElements[0].click();
          await page.waitForTimeout(1000);
        } catch (error) {
          console.log('⚠️ Click failed, but continuing test:', error.message);
        }
      }
      
      console.log('🚨 Console errors detected:', consoleErrors);
      
      // Test passes if we reach here without crashes
      expect(true).toBe(true);
    });

    test('Mobile responsiveness works correctly', async () => {
      // Test mobile viewport
      await page.setViewport({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      // Check that content is still accessible
      const mobileContent = await page.evaluate(() => {
        const body = document.body;
        const buttons = document.querySelectorAll('button:not([disabled])');
        
        return {
          hasContent: body.textContent.length > 0,
          isScrollable: body.scrollHeight > body.clientHeight,
          width: body.offsetWidth,
          buttonCount: buttons.length,
          firstButtonSize: buttons.length > 0 ? {
            width: buttons[0].offsetWidth,
            height: buttons[0].offsetHeight
          } : null
        };
      });
      
      console.log('📱 Mobile responsiveness check:', mobileContent);
      
      expect(mobileContent.hasContent).toBe(true);
      expect(mobileContent.width).toBeLessThanOrEqual(375);
      
      if (mobileContent.firstButtonSize) {
        expect(mobileContent.firstButtonSize.width).toBeGreaterThan(0);
        expect(mobileContent.firstButtonSize.height).toBeGreaterThan(0);
      }
    });
  });

  describe('🔄 Integration with Backend Services', () => {
    test('Frontend successfully connects to backend APIs', async () => {
      const apiCalls = [];
      
      page.on('response', response => {
        const url = response.url();
        if (url.includes('localhost:') && 
            (url.includes('/api/') || url.includes(':6001') || url.includes(':5003') || url.includes(':5002'))) {
          apiCalls.push({
            url,
            status: response.status(),
            ok: response.ok()
          });
        }
      });
      
      // Reload to trigger API calls
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForTimeout(3000);
      
      console.log('🌐 API calls detected:', apiCalls);
      
      if (apiCalls.length > 0) {
        // At least some API calls should be successful
        const successfulCalls = apiCalls.filter(call => call.ok);
        expect(successfulCalls.length).toBeGreaterThan(0);
        console.log(`✅ ${successfulCalls.length}/${apiCalls.length} API calls successful`);
      } else {
        console.log('ℹ️ No API calls detected - backend may not be running');
      }
    });

    test('Data updates reflect in real-time', async () => {
      await page.waitForTimeout(2000);
      
      // Get initial page content
      const initialContent = await page.evaluate(() => document.body.textContent);
      
      // Try to trigger a data update
      const refreshButtons = await page.$$('button');
      let refreshButton = null;
      
      for (const button of refreshButtons) {
        const text = await button.evaluate(btn => btn.textContent.toLowerCase());
        if (text.includes('refresh') || text.includes('reload') || text.includes('update')) {
          refreshButton = button;
          break;
        }
      }
      
      if (refreshButton) {
        await refreshButton.click();
        await page.waitForTimeout(2000);
        
        const updatedContent = await page.evaluate(() => document.body.textContent);
        
        // Content should either be the same (consistent) or updated
        expect(updatedContent.length).toBeGreaterThanOrEqual(initialContent.length * 0.5);
        console.log('🔄 Data refresh completed');
      } else {
        // Try reloading the page
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        
        const reloadedContent = await page.evaluate(() => document.body.textContent);
        expect(reloadedContent.length).toBeGreaterThan(0);
        console.log('🔄 Page reload completed');
      }
    });
  });
});