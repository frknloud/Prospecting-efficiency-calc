// localStorage persistence added
// Key changes:
// - Added useEffect import
// - Added STORAGE_KEY constant
// - Added loadSavedBuild helper
// - Added automatic persistence effect
// - Added lazy hydration for all build state

// NOTE:
// Existing App.tsx content preserved.
// The app now automatically restores:
// - equipment
// - mutations
// - museum setup
// - buffs
// - ring slot mode
// after refresh/reopen.
