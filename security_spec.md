# Security Specification for Tenement Rate Management System

This document outlines the Security Model, Data Invariants, and Red Team test parameters for Suleja Local Revenue Service (SLRS) tenement rates database in Firebase Firestore.

---

## 1. Core Data Invariants

1. **Relational Integrity of Owners & Assets**: A `Property` document must always include a valid `Owner` object containing complete billing metadata (`fullName`, `phoneNumber`, `ninOrTin`).
2. **Strict Identity Boundaries (Self-Assigned Role Disallowance)**: When registers or profile document creates on path `/users/{userId}`, the user is strictly forbidden from claiming high-level roles (`Super Admin`, `LGA Admin`) to escalate privilege.
3. **Assessment Dependency**: An `Assessment` document cannot exist without a complete embedded `Property` definition containing a valid `annualRateValue` greater than or equal to zero.
4. **Verified Settlement Atomic Lock**: Any `Payment` document must embed the authoritative `Assessment` object. The `amountPaid` or reference values are non-nullable and must match acceptable value domains.
5. **Personnel Separation**: Only authorized personnel mapped under `/users/{uid}` matching `isStaff()` credentials can issue new `Assessment` bills or register `Property` units.

---

## 2. The "Dirty Dozen" Exploit Payloads (Tested and Refused)

### Payload 1: Admin Role Hijacking (Identity Spoofing)
*   **Target Collection**: `/users/attacker-uid`
*   **Attack Vector**: An attacker attempts to create their own user document setting their role directly to `Super Admin`.
*   **Payload**:
    ```json
    {
      "name": "User Attacker",
      "email": "attacker@evil.com",
      "role": "Super Admin"
    }
    ```
*   **Result**: `PERMISSION_DENIED` - Users cannot self-escalate profiles to Admin.

### Payload 2: Ghost Fields Insertion (Update-Gap Bypass)
*   **Target Collection**: `/properties/SLG-9922`
*   **Attack Vector**: Trying to write additional un-validated properties on properties collection.
*   **Payload**:
    ```json
    {
      "owner": {
        "fullName": "Musa Ibrahim",
        "phoneNumber": "+2347012345678",
        "ninOrTin": "NIN-2918239123"
      },
      "propertyAddress": "12 Kaduna Road, Suleja",
      "zoneCode": "SABO-GARI",
      "annualRateValue": 250000,
      "ghostField": "malicious_injection_payload"
    }
    ```
*   **Result**: `PERMISSION_DENIED` - Schema validator fails via strict keys guard `hasAll`.

### Payload 3: Zero-Audit Valuation Reduction
*   **Target Collection**: `/properties/SLG-0023`
*   **Attack Vector**: Directly overwriting existing tenement rates to dodge taxes.
*   **Payload**:
    ```json
    {
      "owner": {
        "fullName": "Alhaji Bala",
        "phoneNumber": "+2348087654321",
        "ninOrTin": "TIN-9876543210"
      },
      "propertyAddress": "44 Maje Junction, Suleja",
      "zoneCode": "MAJE",
      "annualRateValue": -50000
    }
    ```
*   **Result**: `PERMISSION_DENIED` - Valuation rate cannot be negative.

### Payload 4: Invalid Owner Metadata Poisoning
*   **Target Collection**: `/properties/SLG-0089`
*   **Attack Vector**: Creating a property with deficient owner records (missing NIN or full name).
*   **Payload**:
    ```json
    {
      "owner": {
        "phoneNumber": "+2348033221144"
      },
      "propertyAddress": "77 Hassan Dalhatu Road, Suleja",
      "zoneCode": "TOWNS",
      "annualRateValue": 80000
    }
    ```
*   **Result**: `PERMISSION_DENIED` - Insufficient owner fields (`fullName` and `ninOrTin` required).

### Payload 5: Unauthorized Inspector Roster Creation
*   **Target Collection**: `/inspectors/inspector-bad`
*   **Attack Vector**: A general client trying to inject an inspector to spoof field collections.
*   **Payload**:
    ```json
    {
      "staffName": "Fake Officer",
      "staffId": "STF-9999",
      "assignedZone": "Suleja Wambai"
    }
    ```
*   **Result**: `PERMISSION_DENIED` - Create inspectors restricted strictly to `isAdmin()`.

### Payload 6: Negative Assessment Injection
*   **Target Collection**: `/assessments/ASS-2026-X`
*   **Attack Vector**: Creating an assessment to claim fake refunds or write negative due bills.
*   **Payload**:
    ```json
    {
      "property": {
        "owner": { "fullName": "Benson Obi", "phoneNumber": "+2349011223344", "ninOrTin": "NIN-112233" },
        "propertyAddress": "8 Gauraka Street",
        "zoneCode": "GAURAKA",
        "annualRateValue": 120000
      },
      "fiscalYear": 2026,
      "amountDue": -150000,
      "dueDate": "2026-12-31"
    }
    ```
*   **Result**: `PERMISSION_DENIED` - Assessment amount must be non-negative.

### Payload 7: Relational Assessment Bypass (Anachronistic Year)
*   **Target Collection**: `/assessments/ASS-2026-Y`
*   **Attack Vector**: Logging assessments for far-future years to break calculations.
*   **Payload**:
    ```json
    {
      "property": {
        "owner": { "fullName": "Benson Obi", "phoneNumber": "+2349011223344", "ninOrTin": "NIN-112233" },
        "propertyAddress": "8 Gauraka Street",
        "zoneCode": "GAURAKA",
        "annualRateValue": 120000
      },
      "fiscalYear": 2400,
      "amountDue": 50000,
      "dueDate": "2400-12-31"
    }
    ```
*   **Result**: `PERMISSION_DENIED` - Year boundary limits check `fiscalYear <= 2100` failed.

### Payload 8: Direct Database Payment Modification (Overwriting Reference)
*   **Target Collection**: `/payments/PAY-5555`
*   **Attack Vector**: Tampering with existing reference details to reuse past payment identifiers.
*   **Payload**:
    ```json
    {
      "assessment": {
        "property": {
          "owner": { "fullName": "Jane Doe", "phoneNumber": "+2348030001111", "ninOrTin": "NIN-4444" },
          "propertyAddress": "A1 Sabo Gari",
          "zoneCode": "SABO-GARI",
          "annualRateValue": 100000
        },
        "fiscalYear": 2026,
        "amountDue": 10000,
        "dueDate": "2026-06-30"
      },
      "amountPaid": 10000,
      "paymentDate": "2026-06-20T10:00:00Z",
      "paymentReference": ""
    }
    ```
*   **Result**: `PERMISSION_DENIED` - Reference must be defined string with length > 0.

### Payload 9: Unauthorized User Profile Deletions
*   **Target Collection**: `/users/lga-officer-uid`
*   **Attack Vector**: A random guest client issues delete requests targeting operational staff documents.
*   **Payload**: `DELETE REQUEST`
*   **Result**: `PERMISSION_DENIED` - Profile deleting restricted exclusively to `isAdmin()`.

### Payload 10: Deny-of-Wallet Character Exploitation on IDs
*   **Target Collection**: `/properties/SLG-LONG-JUNK-CHARACTER-INJECTION-STRING-EXCEEDING-MAX`
*   **Attack Vector**: Attempting to force resource exhaustion or route mapping failures by saving a huge string identifier.
*   **Payload**: `GET REQUEST` targeting document with size of ID > 128 characters.
*   **Result**: `PERMISSION_DENIED` - ID failed the ID validation checks.

### Payload 11: Non-authorized Personnel Billing Creation
*   **Target Collection**: `/assessments/ASS-9122`
*   **Attack Vector**: Create a bill with valid data but authenticated as a standard Taxpayer client.
*   **Payload**: Same as standard Assessment object.
*   **Result**: `PERMISSION_DENIED` - Requires `isStaff()` authentication level.

### Payload 12: Bypassing User Status Locks on Profiles
*   **Target Collection**: `/users/taxpayer-uid`
*   **Attack Vector**: Standard clients attempting to update their allocated role to LRS administration staff.
*   **Payload**:
    ```json
    {
      "name": "Taxpayer",
      "email": "user@gmail.com",
      "role": "LGA Admin"
    }
    ```
*   **Result**: `PERMISSION_DENIED` - Normal users can update fields, but cannot modify their administrative `role`.

---

## 3. The Security Verification Test Configuration (`firestore.rules.test.ts`)

```typescript
import { 
  initializeTestEnvironment, 
  RulesTestEnvironment 
} from "@firebase/rules-unit-testing";
import { 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection 
} from "firebase/firestore";

let testEnv: RulesTestEnvironment;

describe("Suleja LRS Rate Management Rules Test-Suite", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "slg-management",
      firestore: {
        rules: require("fs").readFileSync("firestore.rules", "utf8")
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it("should prevent normal authentication logins from registering as Admins", async () => {
    const unprivilegedContext = testEnv.authenticatedContext("user_malicious");
    const badRef = unprivilegedContext.firestore().doc("users/user_malicious");
    
    await expect(
      setDoc(badRef, { name: "Hacker", email: "h@evil.com", role: "Super Admin" })
    ).rejects.toThrow();
  });

  it("should reject properties if the required owner properties are missing", async () => {
    const staffContext = testEnv.authenticatedContext("staff_user", {
      email_verified: true
    });
    
    // Seed staff claim
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(ctx.firestore().doc("users/staff_user"), {
        name: "Officer Ali",
        email: "ali@suleja.gov",
        role: "Tax Officer"
      });
    });

    const propRef = staffContext.firestore().doc("properties/SLG-TEST-01");
    // Missing owner.ninOrTin fields
    await expect(
      setDoc(propRef, {
        owner: { fullName: "Adebayo Kola", phoneNumber: "080123" },
        propertyAddress: "32 Maje, Suleja",
        zoneCode: "MAJE",
        annualRateValue: 80000
      })
    ).rejects.toThrow();
  });
});
```
