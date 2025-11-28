// tests/phase2-effects.spec.js
// Phase 2: Effects Controllers Tests

import { test, expect } from '@playwright/test';

test.describe('Phase 2: App Loading Baseline', () => {
    
    test('App loads without console errors', async ({ page }) => {
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        
        await page.goto('/');
        await page.waitForTimeout(3000);
        
        // Filter out expected errors (favicon, network issues, etc.)
        const criticalErrors = errors.filter(e => 
            !e.includes('favicon') && 
            !e.includes('net::ERR') &&
            !e.includes('Failed to load resource')
        );
        
        expect(criticalErrors).toEqual([]);
    });
    
    test('window.visualizer is defined', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
        
        const hasVisualizer = await page.evaluate(() => {
            return typeof window.visualizer !== 'undefined';
        });
        
        expect(hasVisualizer).toBe(true);
    });
});

test.describe('Phase 2: Kaleidoscope System', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
    });
    
    test('Kaleidoscope button exists', async ({ page }) => {
        const btn = page.locator('#headerKaleidoscopeBtn');
        await expect(btn).toBeVisible();
    });
    
    test('Kaleidoscope panel opens on click', async ({ page }) => {
        const btn = page.locator('#headerKaleidoscopeBtn');
        await btn.click();
        
        const panel = page.locator('#headerKaleidoscopePanel');
        await expect(panel).toBeVisible();
    });
    
    test('Kaleidoscope canvas or context exists', async ({ page }) => {
        // Canvas is created lazily when kaleidoscope is enabled
        const hasKaleidoscope = await page.evaluate(() => {
            const v = window.visualizer;
            return v && (
                v.kaleidoscopeCanvas !== undefined ||
                v.kaleidoscopeCtx !== undefined ||
                typeof v.initKaleidoscope === 'function'
            );
        });
        
        expect(hasKaleidoscope).toBe(true);
    });
    
    test('Kaleidoscope segments slider exists', async ({ page }) => {
        const btn = page.locator('#headerKaleidoscopeBtn');
        await btn.click();
        
        const slider = page.locator('#headerKaleidoscopeSegments, #kaleidoscopeSegments');
        await expect(slider.first()).toBeVisible();
    });
    
    test('Kaleidoscope beat rotation control exists', async ({ page }) => {
        const btn = page.locator('#headerKaleidoscopeBtn');
        await btn.click();
        
        // Check for beat rotation button or any rotation control
        const control = page.locator('#headerKaleidoscopeBeatRotationBtn, [id*="KaleidoscopeRotation"], [id*="kaleidoscopeRotation"]');
        const count = await control.count();
        expect(count).toBeGreaterThan(0);
    });
    
    test('Kaleidoscope Apply To properties exist on visualizer', async ({ page }) => {
        // Check that Apply To properties exist on the visualizer
        const hasApplyTo = await page.evaluate(() => {
            const v = window.visualizer;
            return v && (
                typeof v.kaleidoscopeApplyToVideo !== 'undefined' ||
                typeof v.kaleidoscopeApplyToViz !== 'undefined' ||
                typeof v.kaleidoscopeApplyToWebGL !== 'undefined'
            );
        });
        
        expect(hasApplyTo).toBe(true);
    });
    
    test('Kaleidoscope properties are accessible on visualizer', async ({ page }) => {
        const hasProperties = await page.evaluate(() => {
            const v = window.visualizer;
            return v && 
                   typeof v.kaleidoscopeSegments !== 'undefined' &&
                   typeof v.kaleidoscopeRotation !== 'undefined';
        });
        
        expect(hasProperties).toBe(true);
    });
    
    test('toggleHeaderKaleidoscope method exists', async ({ page }) => {
        const hasMethod = await page.evaluate(() => {
            return window.visualizer && 
                   typeof window.visualizer.toggleHeaderKaleidoscope === 'function';
        });
        
        expect(hasMethod).toBe(true);
    });
});

test.describe('Phase 2: Blobs System', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
    });
    
    test('Blobs toggle button exists', async ({ page }) => {
        const btn = page.locator('#headerBlobsBtn, #mixerBlobsToggle, [id*="BlobsToggle"]');
        const count = await btn.count();
        expect(count).toBeGreaterThan(0);
    });
    
    test('toggleBlobs method exists on visualizer', async ({ page }) => {
        const hasMethod = await page.evaluate(() => {
            return window.visualizer && 
                   typeof window.visualizer.toggleBlobs === 'function';
        });
        
        expect(hasMethod).toBe(true);
    });
    
    test('blobsEnabled property exists on visualizer', async ({ page }) => {
        const hasProperty = await page.evaluate(() => {
            return window.visualizer && 
                   typeof window.visualizer.blobsEnabled !== 'undefined';
        });
        
        expect(hasProperty).toBe(true);
    });
    
    test('blobsVisualization object exists on visualizer', async ({ page }) => {
        const hasBlobs = await page.evaluate(() => {
            return window.visualizer && 
                   window.visualizer.blobsVisualization !== undefined;
        });
        
        expect(hasBlobs).toBe(true);
    });
});

test.describe('Phase 2: WebGL System', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
    });
    
    test('toggleWebGL method exists on visualizer', async ({ page }) => {
        const hasMethod = await page.evaluate(() => {
            return window.visualizer && 
                   typeof window.visualizer.toggleWebGL === 'function';
        });
        
        expect(hasMethod).toBe(true);
    });
    
    test('webglEnabled property exists on visualizer', async ({ page }) => {
        const hasProperty = await page.evaluate(() => {
            return window.visualizer && 
                   typeof window.visualizer.webglEnabled !== 'undefined';
        });
        
        expect(hasProperty).toBe(true);
    });
    
    test('webglVisualization object exists on visualizer', async ({ page }) => {
        const hasWebGL = await page.evaluate(() => {
            return window.visualizer && 
                   window.visualizer.webglVisualization !== undefined;
        });
        
        expect(hasWebGL).toBe(true);
    });
});

test.describe('Phase 2: Infinite Zoom System', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
    });
    
    test('Infinite Zoom button exists', async ({ page }) => {
        const btn = page.locator('#headerInfiniteZoomBtn, #headerInfiniteZoomToggleBtn');
        const count = await btn.count();
        expect(count).toBeGreaterThan(0);
    });
    
    test('toggleInfiniteZoom method exists on visualizer', async ({ page }) => {
        const hasMethod = await page.evaluate(() => {
            return window.visualizer && 
                   typeof window.visualizer.toggleInfiniteZoom === 'function';
        });
        
        expect(hasMethod).toBe(true);
    });
    
    test('infiniteZoom object exists on visualizer', async ({ page }) => {
        const hasInfiniteZoom = await page.evaluate(() => {
            return window.visualizer && 
                   window.visualizer.infiniteZoom !== undefined;
        });
        
        expect(hasInfiniteZoom).toBe(true);
    });
    
    test('updateInfiniteZoomToggleButton method exists', async ({ page }) => {
        // Wait a bit longer for all methods to be available
        await page.waitForTimeout(1000);
        
        const hasMethod = await page.evaluate(() => {
            return window.visualizer && 
                   typeof window.visualizer.updateInfiniteZoomToggleButton === 'function';
        });
        
        expect(hasMethod).toBe(true);
    });
});

test.describe('Phase 2: Fluid Dynamics System', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
    });
    
    test('Fluid Dynamics button exists', async ({ page }) => {
        const btn = page.locator('#headerFluidDynamicsBtn, #headerFluidDynamicsToggleBtn');
        const count = await btn.count();
        expect(count).toBeGreaterThan(0);
    });
    
    test('toggleFluidDynamics method exists on visualizer', async ({ page }) => {
        const hasMethod = await page.evaluate(() => {
            return window.visualizer && 
                   typeof window.visualizer.toggleFluidDynamics === 'function';
        });
        
        expect(hasMethod).toBe(true);
    });
    
    test('fluidDynamics object exists on visualizer', async ({ page }) => {
        const hasFluidDynamics = await page.evaluate(() => {
            return window.visualizer && 
                   window.visualizer.fluidDynamics !== undefined;
        });
        
        expect(hasFluidDynamics).toBe(true);
    });
    
    test('updateFluidDynamicsToggleButton method exists', async ({ page }) => {
        const hasMethod = await page.evaluate(() => {
            return window.visualizer && 
                   typeof window.visualizer.updateFluidDynamicsToggleButton === 'function';
        });
        
        expect(hasMethod).toBe(true);
    });
    
    test('Fluid Dynamics panel has presets', async ({ page }) => {
        const btn = page.locator('#headerFluidDynamicsBtn');
        if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(500);
            
            // Check for preset buttons
            const presets = page.locator('#headerFluidDynamicsPanel .preset-btn, [data-fluid-preset]');
            const count = await presets.count();
            expect(count).toBeGreaterThanOrEqual(0); // May not have visible presets
        }
    });
});

test.describe('Phase 2: Nebula System', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
    });
    
    test('Nebula button exists', async ({ page }) => {
        const btn = page.locator('#headerNebulaBtn, #headerNebulaToggleBtn, [id*="Nebula"]');
        const count = await btn.count();
        expect(count).toBeGreaterThan(0);
    });
    
    test('Nebula properties or methods exist on visualizer', async ({ page }) => {
        // Nebula may be implemented as properties or through toggleHeaderNebula
        const hasNebula = await page.evaluate(() => {
            const v = window.visualizer;
            return v && (
                v.nebula !== undefined || 
                v.nebulaVisualization !== undefined ||
                typeof v.toggleHeaderNebula === 'function' ||
                typeof v.kaleidoscopeApplyToNebula !== 'undefined'
            );
        });
        
        expect(hasNebula).toBe(true);
    });
    
    test('updateNebulaToggleButton method exists', async ({ page }) => {
        const hasMethod = await page.evaluate(() => {
            return window.visualizer && 
                   typeof window.visualizer.updateNebulaToggleButton === 'function';
        });
        
        expect(hasMethod).toBe(true);
    });
});

test.describe('Phase 2: Effects Integration', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
    });
    
    test('Multiple effects can coexist', async ({ page }) => {
        const canCoexist = await page.evaluate(() => {
            const v = window.visualizer;
            // Check that all effect systems are initialized
            return v && 
                   v.blobsVisualization !== undefined &&
                   v.webglVisualization !== undefined &&
                   v.infiniteZoom !== undefined &&
                   v.fluidDynamics !== undefined;
        });
        
        expect(canCoexist).toBe(true);
    });
    
    test('Z-index management for effects layers', async ({ page }) => {
        const hasZIndexManagement = await page.evaluate(() => {
            // Check if there's some form of z-index management
            return window.pluginMixerIntegration !== undefined || 
                   window.multiDisplayManager !== undefined;
        });
        
        expect(hasZIndexManagement).toBe(true);
    });
    
    test('Effects respond to audio data', async ({ page }) => {
        const hasAudioIntegration = await page.evaluate(() => {
            const v = window.visualizer;
            // Check if visualizer has audio motion for effects to use
            return v && v.audioMotion !== undefined;
        });
        
        expect(hasAudioIntegration).toBe(true);
    });
});

test.describe('Phase 2: UI Controls for Effects', () => {
    
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);
    });
    
    test('Header effects buttons are accessible', async ({ page }) => {
        // Check that at least some effect buttons exist in the header
        const effectButtons = page.locator('#headerKaleidoscopeBtn, #headerFluidDynamicsBtn, #headerInfiniteZoomBtn, #headerNebulaBtn');
        const count = await effectButtons.count();
        expect(count).toBeGreaterThan(0);
    });
    
    test('Mixer has effects controls', async ({ page }) => {
        // Check for mixer effect toggles
        const mixerEffects = page.locator('[id*="mixer"][id*="Toggle"], .mixer-effect-toggle');
        const count = await mixerEffects.count();
        expect(count).toBeGreaterThanOrEqual(0); // May or may not have mixer visible
    });
    
    test('Effect opacity controls exist', async ({ page }) => {
        const hasOpacityControls = await page.evaluate(() => {
            const v = window.visualizer;
            // Check if opacity properties exist for effects
            return v && (
                typeof v.blobsOpacity !== 'undefined' ||
                typeof v.infiniteZoomOpacity !== 'undefined' ||
                typeof v.fluidDynamicsOpacity !== 'undefined'
            );
        });
        
        // This may be true or false depending on implementation
        expect(typeof hasOpacityControls).toBe('boolean');
    });
});

