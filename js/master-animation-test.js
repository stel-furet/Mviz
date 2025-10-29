/**
 * Master Animation Controller Test System
 * Simple test system to verify the foundation works correctly
 */

class MasterAnimationTestSystem {
    constructor() {
        this.testCounter = 0;
        this.lastUpdateTime = 0;
        this.isRegistered = false;
        
        // Auto-register when Master Animation Controller is available
        this.checkAndRegister();
    }
    
    checkAndRegister() {
        if (window.masterAnimationController && !this.isRegistered) {
            this.register();
        } else {
            // Try again in 100ms
            setTimeout(() => this.checkAndRegister(), 100);
        }
    }
    
    register() {
        const success = window.masterAnimationController.registerSystem('test-system', {
            priority: 6, // Same as Blobs (low priority for testing)
            targetFPS: 30, // Test at 30fps
            isActive: true,
            isPlugin: false,
            update: this.update.bind(this),
            render: this.render.bind(this),
            cleanup: this.cleanup.bind(this),
            errorHandler: this.errorHandler.bind(this)
        });
        
        if (success) {
            this.isRegistered = true;
            console.log('🧪 Master Animation Test System registered successfully');
        } else {
            console.error('🧪 Failed to register Master Animation Test System');
        }
    }
    
    update(deltaTime, timestamp) {
        this.testCounter++;
        this.lastUpdateTime = timestamp;
        
        // Disable automatic testing to reduce console spam
        // if (this.testCounter % 60 === 0) {
        //     this.runBasicTests();
        // }
    }
    
    render(deltaTime, timestamp) {
        // Disable render logging to reduce console spam
        // if (this.testCounter % 300 === 0) {
        //     console.log(`🧪 Test System Render: Frame ${this.testCounter}, Delta: ${deltaTime.toFixed(2)}ms`);
        // }
    }
    
    cleanup() {
        console.log('🧪 Test System cleanup called');
        this.testCounter = 0;
        this.isRegistered = false;
    }
    
    errorHandler(error) {
        console.error('🧪 Test System Error:', error);
    }
    
    runBasicTests() {
        if (!window.masterAnimationController) return;
        
        const controller = window.masterAnimationController;
        
        // Test 1: Get performance stats
        const stats = controller.getPerformanceStats();
        
        // Test 2: Get system status
        const systemStatus = controller.getSystemStatus('test-system');
        
        // Test 3: Get registered systems
        const systems = controller.getRegisteredSystems();
        
        console.log('🧪 Master Animation Controller Test Results:', {
            performanceStats: stats,
            testSystemStatus: systemStatus,
            registeredSystems: systems,
            testFrameCount: this.testCounter
        });
    }
    
    // Manual test methods for console access
    testSystemActivation() {
        if (!window.masterAnimationController) {
            console.error('🧪 Master Animation Controller not available');
            return;
        }
        
        const controller = window.masterAnimationController;
        
        // Test deactivation
        console.log('🧪 Testing system deactivation...');
        controller.setSystemActive('test-system', false);
        
        setTimeout(() => {
            console.log('🧪 Testing system reactivation...');
            controller.setSystemActive('test-system', true);
        }, 2000);
    }
    
    testErrorHandling() {
        // Intentionally throw an error to test error handling
        throw new Error('🧪 Intentional test error - should be caught and logged');
    }
}

// Initialize test system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only create test system if Master Animation Controller is enabled for testing
    window.masterAnimationTestSystem = new MasterAnimationTestSystem();
    
    // Make test methods available globally for console testing
    window.testMasterAnimation = {
        testActivation: () => window.masterAnimationTestSystem.testSystemActivation(),
        testError: () => window.masterAnimationTestSystem.testErrorHandling(),
        getStats: () => {
            if (window.masterAnimationController) {
                return window.masterAnimationController.getPerformanceStats();
            }
            return null;
        },
        getSystems: () => {
            if (window.masterAnimationController) {
                return window.masterAnimationController.getRegisteredSystems();
            }
            return null;
        }
    };
    
    console.log('🧪 Master Animation Test System initialized. Use window.testMasterAnimation for manual testing.');
});
