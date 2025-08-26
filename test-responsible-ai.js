/**
 * Simple test to verify Responsible AI page functionality
 * Run: node test-responsible-ai.js
 */

const puppeteer = require('puppeteer');

async function testResponsibleAIPage() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    const baseUrl = `http://0.0.0.0:${process.env.PORT || 5000}`;
    
    console.log('🔍 Testing Responsible AI Page...\n');
    
    // Test 1: Footer link exists
    console.log('Test 1: Check footer link...');
    await page.goto(baseUrl);
    await page.waitForSelector('footer', { timeout: 5000 });
    
    const footerLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('footer a'));
      return links.find(link => link.textContent === 'Responsible AI');
    });
    
    if (footerLink) {
      console.log('✅ Footer link found');
    } else {
      console.log('❌ Footer link not found');
      throw new Error('Footer link for Responsible AI not found');
    }
    
    // Test 2: Navigate to Responsible AI page
    console.log('\nTest 2: Navigate to Responsible AI page...');
    await page.goto(`${baseUrl}/responsible-ai`);
    await page.waitForSelector('h1', { timeout: 5000 });
    
    const pageTitle = await page.$eval('h1', el => el.textContent);
    if (pageTitle.includes('Responsible AI')) {
      console.log('✅ Page loads correctly');
    } else {
      console.log('❌ Page title incorrect');
      throw new Error('Responsible AI page did not load correctly');
    }
    
    // Test 3: Check all section headings
    console.log('\nTest 3: Check section headings...');
    const expectedSections = [
      'Personalized AI',
      'Innovative AI', 
      'Embedded AI',
      'Accessible AI',
      'Honest AI',
      'Thoroughly Tested'
    ];
    
    const sectionHeadings = await page.evaluate(() => {
      const headings = document.querySelectorAll('h2');
      return Array.from(headings).map(h => h.textContent);
    });
    
    const foundSections = [];
    const missingSections = [];
    
    expectedSections.forEach(section => {
      if (sectionHeadings.some(h => h.includes(section))) {
        foundSections.push(section);
      } else {
        missingSections.push(section);
      }
    });
    
    console.log(`✅ Found ${foundSections.length}/${expectedSections.length} sections:`);
    foundSections.forEach(s => console.log(`   - ${s}`));
    
    if (missingSections.length > 0) {
      console.log(`❌ Missing sections:`);
      missingSections.forEach(s => console.log(`   - ${s}`));
    }
    
    // Test 4: Check anchor navigation
    console.log('\nTest 4: Check anchor navigation...');
    const navButtons = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      if (!nav) return 0;
      const buttons = nav.querySelectorAll('button');
      return buttons.length;
    });
    
    if (navButtons >= 6) {
      console.log(`✅ Navigation buttons present (${navButtons} found)`);
    } else {
      console.log(`⚠️  Only ${navButtons} navigation buttons found`);
    }
    
    // Test 5: Check mobile responsiveness
    console.log('\nTest 5: Check mobile responsiveness...');
    await page.setViewport({ width: 375, height: 667 }); // iPhone size
    
    const mobileMenuVisible = await page.evaluate(() => {
      const desktopNav = document.querySelector('nav .md\\:flex');
      if (desktopNav) {
        const computed = window.getComputedStyle(desktopNav);
        return computed.display === 'none';
      }
      return true;
    });
    
    if (mobileMenuVisible) {
      console.log('✅ Mobile view working correctly');
    } else {
      console.log('⚠️  Desktop nav might not be hidden on mobile');
    }
    
    // Test 6: Check SEO meta tags
    console.log('\nTest 6: Check SEO meta tags...');
    const metaTags = await page.evaluate(() => {
      const title = document.title;
      const description = document.querySelector('meta[name="description"]')?.content;
      const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
      return { title, description, ogTitle };
    });
    
    if (metaTags.title && metaTags.title.includes('Responsible AI')) {
      console.log('✅ Page title set correctly');
    } else {
      console.log('❌ Page title not set');
    }
    
    if (metaTags.description) {
      console.log('✅ Meta description present');
    } else {
      console.log('❌ Meta description missing');
    }
    
    if (metaTags.ogTitle) {
      console.log('✅ OpenGraph tags present');
    } else {
      console.log('⚠️  OpenGraph tags may be missing');
    }
    
    // Test 7: Check contact link
    console.log('\nTest 7: Check contact link...');
    const contactLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.some(link => link.href.includes('/contact'));
    });
    
    if (contactLink) {
      console.log('✅ Contact link present');
    } else {
      console.log('❌ Contact link not found');
    }
    
    console.log('\n✨ All tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the test
testResponsibleAIPage().catch(console.error);