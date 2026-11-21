# Campus Marketplace (Unimart) — UML Diagrams Reference

**Course:** Software Development Fundamentals  
**Project:** Campus Marketplace (Unimart) Mobile Application  
**Version:** 3.0  
**Specification Reference:** Campus Marketplace UML Architecture  

---

## 1. Use Case Diagram

```mermaid
flowchart LR
    Student(("🎓 Student\n(Buyer / Seller)"))
    Verifier(("🛡️ Verifier"))
    Admin(("👑 Administrator"))

    subgraph Auth ["Authentication & Profiles"]
        UC1["Register / Login (Clerk)"]
        UC2["View / Edit Profile"]
        UC3["Toggle Buyer / Seller Mode"]
    end

    subgraph Marketplace ["Product Discovery & Wishlist"]
        UC4["Search & Filter Listings"]
        UC5["View Product Details"]
        UC6["Save to Wishlist"]
    end

    subgraph ListingMgmt ["Listing Management"]
        UC7["Create Product Listing"]
        UC8["AI-Assisted Listing Assist"]
        UC9["Edit / Resubmit Listing"]
    end

    subgraph OrdersComm ["Orders, Chat & Meetup"]
        UC10["Place Order & Select Meetup"]
        UC11["Digital UPI / Cash Payment"]
        UC12["Order-Linked Chat Messaging"]
        UC13["Track Order Status"]
        UC14["Request Return / Refund"]
    end

    subgraph Moderation ["Moderation & Administration"]
        UC15["Submit Community Report"]
        UC16["Approve / Reject Listing"]
        UC17["Request Changes on Listing"]
        UC18["Resolve Community Reports"]
        UC19["Suspend / Restore User"]
    end

    Student --> UC1
    Student --> UC2
    Student --> UC3
    Student --> UC4
    Student --> UC5
    Student --> UC6
    Student --> UC7
    Student --> UC8
    Student --> UC9
    Student --> UC10
    Student --> UC11
    Student --> UC12
    Student --> UC13
    Student --> UC14
    Student --> UC15

    Verifier --> UC16
    Verifier --> UC17
    Verifier --> UC18

    Admin --> UC16
    Admin --> UC17
    Admin --> UC18
    Admin --> UC19
```

---

## 2. Sequence Diagrams

### 2.1 Order Checkout, Meetup Coordination & Digital Payment Flow

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as 🎓 Buyer
    participant Mobile as 📱 Mobile App (Expo)
    participant Server as ⚙️ Express Backend
    participant NeonDB as 🐘 Neon PostgreSQL
    actor Seller as 🎓 Seller

    Buyer->>Mobile: Selects product & taps "Buy Now"
    Mobile->>Server: GET /api/meetup-locations
    Server->>NeonDB: SELECT * FROM meetup_locations
    NeonDB-->>Server: Return certified safe campus zones
    Server-->>Mobile: List of safe meetup points
    Buyer->>Mobile: Chooses Library Foyer & UPI Payment
    Buyer->>Mobile: Taps "Confirm Order"
    
    Mobile->>Server: POST /api/orders (atomic reservation)
    Server->>NeonDB: UPDATE products SET status='sold' WHERE id=$1 AND status='available'
    alt Product already claimed
        NeonDB-->>Server: 0 rows affected
        Server-->>Mobile: 409 Conflict (Already Sold)
    else Product successfully reserved
        NeonDB-->>Server: 1 row affected (Locked)
        Server->>NeonDB: INSERT INTO orders ... RETURNING id
        Server->>NeonDB: INSERT INTO notifications (Seller: order_placed)
        Server-->>Mobile: 201 Created (Order Object)
        
        Mobile->>Server: POST /api/payments/initiate (method: 'upi_demo')
        Server-->>Mobile: 200 OK (transactionRef)
        Mobile->>Server: POST /api/payments/verify
        Server->>NeonDB: INSERT INTO payments (status='completed')
        Server->>NeonDB: UPDATE orders SET payment_ref=$ref
        Server-->>Mobile: 200 OK (Payment Verified)
        
        Seller->>Mobile: Receives in-app alert & views Seller Orders
        Seller->>Mobile: Confirms order & arranges meetup in Chat
        Mobile->>Server: POST /api/messages (orderId, content)
        Server->>NeonDB: INSERT INTO messages ...
        Server-->>Buyer: In-App Message Alert
    end
```

### 2.2 Product Verification & Change Request Flow

```mermaid
sequenceDiagram
    autonumber
    actor Seller as 🎓 Student Seller
    participant Mobile as 📱 Mobile App
    participant Server as ⚙️ Express Backend
    participant NeonDB as 🐘 Neon PostgreSQL
    actor Verifier as 🛡️ Campus Verifier

    Seller->>Mobile: Fills listing details & taps "✨ AI Assist"
    Mobile->>Server: POST /api/ai/suggest
    Server-->>Mobile: Recommended category, title refinement, tips
    Seller->>Mobile: Submits listing
    Mobile->>Server: POST /api/products (status: 'pending_review')
    Server->>NeonDB: INSERT INTO products (status='pending_review')
    Server-->>Mobile: 201 Created

    Verifier->>Mobile: Opens Admin Dashboard > "Pending" Tab
    Mobile->>Server: GET /api/admin/pending
    Server->>NeonDB: SELECT * FROM products WHERE status IN ('pending_review', ...)
    Server-->>Mobile: Pending listings queue

    alt Verifier Requests Changes
        Verifier->>Mobile: Taps "Request Changes" & enters revision notes
        Mobile->>Server: POST /api/admin/products/:id/request-changes
        Server->>NeonDB: UPDATE products SET status='changes_requested'
        Server->>NeonDB: INSERT INTO verifications (action='changes_requested')
        Server->>NeonDB: INSERT INTO notifications (Seller: changes_requested)
        Server-->>Mobile: 200 OK
        Seller->>Mobile: Receives alert, updates listing, resubmits
    else Verifier Approves Listing
        Verifier->>Mobile: Taps "Approve"
        Mobile->>Server: POST /api/admin/products/:id/approve
        Server->>NeonDB: UPDATE products SET status='available'
        Server->>NeonDB: INSERT INTO verifications (action='approved')
        Server->>NeonDB: INSERT INTO notifications (Seller: product_approved)
        Server-->>Mobile: 200 OK (Listing Published)
    end
```

---

## 3. State Machine Diagrams

### 3.1 Product Listing Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft : Student prepares listing
    Draft --> PendingReview : Submit for moderation
    PendingReview --> Available : Admin / Verifier approves
    PendingReview --> Rejected : Admin / Verifier rejects with reason
    PendingReview --> ChangesRequested : Verifier requests revisions
    ChangesRequested --> PendingReview : Seller updates & resubmits
    Rejected --> PendingReview : Seller edits & resubmits
    Available --> Sold : Buyer places order
    Sold --> Available : Order cancelled / restocked
    Available --> Removed : Moderator removes (terms violation)
    Sold --> [*] : Transaction finalized
    Removed --> [*]
```

### 3.2 Order & Return/Refund Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Placed : Buyer places order (atomic lock)
    Placed --> Cancelled : Buyer or Seller cancels (restocks product)
    Placed --> Confirmed : Seller confirms order
    Confirmed --> MeetupArranged : Parties agree on meetup time/zone
    Confirmed --> Cancelled : Transaction cancelled
    MeetupArranged --> Completed : Item inspected & handed over
    Completed --> ReturnRequested : Buyer requests return within policy
    ReturnRequested --> ReturnApproved : Seller / Admin approves refund
    ReturnRequested --> ReturnRejected : Seller / Admin rejects claim
    ReturnApproved --> Refunded : Refund processed (sandbox / demo)
    Completed --> [*] : Transaction complete
    Cancelled --> [*]
    Refunded --> [*]
```

---

## 4. Activity Diagram: Order Placement & Campus Meetup Coordination

```mermaid
flowchart TD
    Start([Start]) --> Browse[Buyer browses marketplace]
    Browse --> Detail[View product details]
    Detail --> InWishlist{Save for later?}
    InWishlist -- Yes --> Wishlist[Toggle Heart: Wishlist saved in Neon]
    InWishlist -- No --> BuyNow[Tap 'Buy Now']
    
    BuyNow --> Checkout[Checkout Screen: Load certified meetup points]
    Checkout --> PickMeetup[Select safe meetup zone e.g. Library Foyer]
    Checkout --> PickPayment[Select Payment: UPI Digital vs Cash on Meetup]
    PickPayment --> ConfirmOrder[Tap Confirm Order]
    
    ConfirmOrder --> AtomicCheck{Product available?}
    AtomicCheck -- No --> Conflict[Display Error: Item already sold]
    Conflict --> Browse
    
    AtomicCheck -- Yes --> ReserveItem[Atomically reserve product: status='sold']
    ReserveItem --> CreateOrder[Create order record in Neon]
    CreateOrder --> CheckPayType{Payment method?}
    CheckPayType -- UPI Digital --> InitiateUPI[Initiate & verify sandbox UPI payment]
    InitiateUPI --> NotifySeller[Emit in-app notification to seller]
    CheckPayType -- Cash on Meetup --> NotifySeller
    
    NotifySeller --> SellerReview[Seller opens Seller Orders tab]
    SellerReview --> ConfirmAccept{Seller accepts?}
    ConfirmAccept -- No --> CancelOrder[Cancel order & restock product to available]
    CancelOrder --> End([End])
    
    ConfirmAccept -- Yes --> OrderConfirmed[Status: Confirmed]
    OrderConfirmed --> ChatCoord[Buyer & Seller chat in order-scoped chat room]
    ChatCoord --> MeetPhysical[Physical meetup at certified safe zone]
    MeetPhysical --> InspectItem{Item inspected & verified?}
    InspectItem -- Accept --> Handover[Seller marks order Completed]
    InspectItem -- Defect --> ReturnRequest[Buyer requests Return / Refund]
    Handover --> End
    ReturnRequest --> End
```

---

## 5. Class Diagram (Data Entities & Relationships)

```mermaid
classDiagram
    class User {
        +UUID id
        +String clerkId
        +String fullName
        +String email
        +String university
        +String avatarUrl
        +UserRole role
        +UserStatus status
        +Float rating
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Product {
        +UUID id
        +UUID sellerId
        +String title
        +String description
        +Float price
        +ProductCategory category
        +ProductCondition condition
        +ProductStatus status
        +String[] images
        +Boolean aiVerified
        +UUID verifierId
        +String rejectionReason
        +DateTime reviewedAt
        +String campusLocation
        +DateTime createdAt
    }

    class Order {
        +UUID id
        +UUID productId
        +UUID buyerId
        +UUID sellerId
        +OrderStatus status
        +Float amount
        +String paymentRef
        +String meetupLocation
        +DateTime meetupTime
        +DateTime createdAt
    }

    class Message {
        +UUID id
        +UUID orderId
        +UUID senderId
        +UUID receiverId
        +String content
        +Boolean read
        +DateTime createdAt
    }

    class Wishlist {
        +UUID userId
        +UUID productId
        +DateTime createdAt
    }

    class AppNotification {
        +UUID id
        +UUID userId
        +NotificationType type
        +String title
        +String message
        +String data
        +Boolean read
        +DateTime createdAt
    }

    class CampusMeetupLocation {
        +UUID id
        +String name
        +String description
        +String campusZone
        +Boolean safeZoneCertified
        +String operatingHours
        +Float latitude
        +Float longitude
        +DateTime createdAt
    }

    class CommunityReport {
        +UUID id
        +UUID reporterId
        +String targetType
        +UUID targetId
        +ReportReason reason
        +String details
        +ReportStatus status
        +String resolutionNotes
        +UUID resolvedBy
        +DateTime createdAt
    }

    class VerificationLog {
        +UUID id
        +UUID productId
        +UUID reviewerId
        +VerificationAction action
        +String notes
        +DateTime createdAt
    }

    class PaymentTransaction {
        +UUID id
        +UUID orderId
        +UUID payerId
        +UUID payeeId
        +Float amount
        +PaymentMethod method
        +PaymentStatus status
        +String transactionRef
        +DateTime createdAt
    }

    class ReturnRequest {
        +UUID id
        +UUID orderId
        +UUID productId
        +UUID buyerId
        +UUID sellerId
        +ReturnReason reason
        +String details
        +ReturnStatus status
        +String sellerNotes
        +DateTime createdAt
    }

    User "1" --> "*" Product : sells
    User "1" --> "*" Order : places (buyer)
    User "1" --> "*" Order : receives (seller)
    Product "1" --> "*" Order : purchased in
    Order "1" --> "*" Message : scoped to
    User "1" --> "*" Message : sends
    User "1" --> "*" Wishlist : bookmarks
    Product "1" --> "*" Wishlist : bookmarked in
    User "1" --> "*" AppNotification : receives
    Product "1" --> "*" VerificationLog : audited in
    Order "1" --> "*" PaymentTransaction : paid through
    Order "1" --> "*" ReturnRequest : disputed in
    User "1" --> "*" CommunityReport : files
```

