# Functional Specifications - StockPILE

## 1. System Overview
StockPILE is a comprehensive inventory and sales management system designed to track stock levels, manage procurement from providers, handle sales to customers, and monitor financial transactions. The system aims to provide a centralized platform for managing the lifecycle of goods from acquisition to sale.

## 2. Functional Modules

### 2.1 Inventory Management
The system provides tools to organize and track physical inventory.
- **Product Categorization**: Organize products into logical categories for better management and reporting.
- **Product Definition**: Maintain a catalog of products with base details such as name, description, and standard pricing.
- **Stock Batch Tracking (Product Classes)**: Track specific batches of products. This allows for managing inventory that may have different costs, entry dates, or variations (labels) under the same parent product.

### 2.2 Partner Management
The system maintains registries for external entities involved in business operations.
- **Provider Management**: Manage a directory of suppliers (Providers) for procurement processes.
- **Customer Management**: Maintain customer profiles to link sales and track purchase history.

### 2.3 Procurement (Supply Chain)
Features to manage the acquisition of stock from suppliers.
- **Purchase Orders (Product Commands)**: Create and track orders placed with providers.
- **Order Line Items (Command Units)**: Specify individual products, quantities, and negotiated prices within an order.
- **Order Lifecycle**: Monitor the status of orders from initiation to finalization.
- **Delivery Tracking**: Record delivery dates and integrate received items into Stock Batches.

### 2.4 Sales Management
Features to handle the selling process to customers.
- **Sales Transactions**: Record sales events, linking them to specific customers and the manager responsible.
- **Sales Line Items (Sale Units)**: Deducing specific quantities from Stock Batches upon sale.
- **Financial Status**: Track the total amount of the sale versus the amount actually paid (handling partial payments).

### 2.5 Financial Management
A module to track monetary flows associated with operations.
- **Payment Recording**: Log individual payment records.
- **Transaction Linking**: Link payments directly to their source context—either a Sale (Revenue) or a Purchase Order (Expense).
- **Audit**: Associate every payment with the Manager who processed it.

### 2.6 User & Access Management
- **Manager Access**: distinct profiles for workspace staff with credentials and execution rights.
- **User Administration**: General user profiles with personal details (address, level, etc.).
- **Group Probiles**: Ability to associate users with specific groups for role-based categorization.

---

## 3. Data Dictionary & Domain Entities

### Stock Entities

| Entity | Description | Key Attributes | Relationships |
| :--- | :--- | :--- | :--- |
| **Category** | A classification group for products. | Name, Description, Status (Active/Inactive) | Parent to multiple Products. |
| **Product** | The abstract definition of an item sold or stocked. | Name, Description, Base Unit Price, Status | Belongs to a Category. |
| **Stock Batch** (Product Class) | A concrete instance or batch of a product in inventory. | Label/Batch ID, Unit Price (Cost), Quantity (Stock Level), Date of Entry | Instance of a Product. |

### Partner Entities

| Entity | Description | Key Attributes | Relationships |
| :--- | :--- | :--- | :--- |
| **Provider** | A supplier from whom goods are purchased. | Name, Status | Associated with Purchase Orders. |
| **Customer** | An entity to whom goods are sold. | Name, Status | Associated with Sales. |

### Operational Entities

| Entity | Description | Key Attributes | Relationships |
| :--- | :--- | :--- | :--- |
| **Purchase Order** (Product Command) | An order placed to a supplier to acquire goods. | Initiation Date, Finalization Date, Total Amount, Payment Status (Boolean), Status | Issued to a Provider. Created by a Manager. |
| **Order Item** (Product Command Unit) | A single line item within a purchase order. | Quantity, Unit Price, Delivery Date | Links a Purchase Order to a specific Stock Batch (Product Class). |
| **Sale** | A sales transaction with a customer. | Initiation Date, Finalization Date, Total Amount, Amount Paid, Payment Status, Status | Issued to a Customer. Processed by a Manager. |
| **Sale Item** (Sale Unit) | A single line item within a sale. | Quantity, Unit Price, Delivery Date | Links a Sale to a specific Stock Batch (Product Class). |

### Financial & Admin Entities

| Entity | Description | Key Attributes | Relationships |
| :--- | :--- | :--- | :--- |
| **Payment** | A record of money transfer. | Date, Amount, Status | Links to either a Sale OR a Purchase Order. Processed by a Manager. |
| **Manager** | An administrative user authorized to perform operations. | Name, Password, Status | Associated with Sales, Payments, and Purchase Orders. |
| **User** | General system user profile. | Name, Password, Address, Gender, Birth Date, Level, Creator Code | Can belong to User Groups. |
| **User Group** | Mapping between users and logical groups. | Status | Links User to a Group. |
