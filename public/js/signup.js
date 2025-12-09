document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            // You can add client-side validation here if needed
            const mobileInput = document.getElementById('mobile');
            const mobileValue = mobileInput.value.trim();
            
            // Simple validation for mobile number (should only contain digits)
            if (!/^\d+$/.test(mobileValue)) {
                e.preventDefault();
                alert('Mobile number should only contain digits (including country code)');
                mobileInput.focus();
                return false;
            }
            
            return true;
        });
    }
});