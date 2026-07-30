# MissVill OS — System Architecture

## 1. System Overview

MissVill OS คือระบบปฏิบัติการภายในบริษัท MissVill Studio สำหรับบริหารงานหลักของบริษัทในระบบเดียว

ระบบพัฒนาด้วย:

- Google Apps Script
- Google Sheets
- Google Drive
- LINE OA / LINE LIFF
- HTML Service
- GitHub
- clasp

---

## 2. Primary Objectives

เป้าหมายหลักของระบบคือ:

1. ลดงานซ้ำของเจ้าของและพนักงาน
2. ทำให้ข้อมูลบริษัทอยู่ในระบบเดียว
3. ตรวจสอบย้อนหลังได้
4. รองรับการทำงานผ่านโทรศัพท์
5. ขยายโมดูลตามการเติบโตของธุรกิจได้

---

## 3. System Modules

### Core

ฟังก์ชันพื้นฐานที่ทุกโมดูลใช้งานร่วมกัน

- Configuration
- Constants
- Validation
- Logging
- Error Handling
- Response Formatting
- ID Generation
- Date and Time
- GPS Utilities
- File Management
- Permissions

### HR

บริหารพนักงานและการทำงาน

- Employees
- Positions
- Employment Types
- Attendance
- Locations
- Shifts
- Leave
- Holidays
- Payroll

### Commerce

บริหาร Live Commerce และคำสั่งซื้อ

- Live Schedule
- Live Sessions
- Live Hosts
- Live Assistants
- Customers
- Orders
- Payments
- Billing
- Packing
- Shipping

### Inventory

บริหารสินค้าและสต็อก

- Products
- Product Variants
- Warehouses
- Stock Movements
- Purchase Orders
- Stock Transfers
- Stock Adjustments

### Finance

บริหารข้อมูลทางการเงิน

- Revenue
- Expenses
- Payment Fees
- Fixed Costs
- Profit
- Cash Flow
- Tax References

### Dashboard

แสดงข้อมูลสำคัญสำหรับเจ้าของบริษัท

- Daily Sales
- Gross Profit
- Employees Working
- Pending Attendance Approval
- Pending Orders
- Pending Payments
- Pending Packing
- Pending Shipping
- Live Performance
- Advertising Performance

---

## 4. Architecture Layers

ระบบใช้โครงสร้างแบบ Layered Architecture

```text
Frontend (LINE LIFF / HTML Service)
        │
        ▼
Controller
        │
        ▼
Service
        │
        ▼
Repository
        │
        ▼
Google Sheets / Google Drive
```

### Layer Responsibilities

#### Frontend

- รับข้อมูลจากผู้ใช้งาน
- แสดงผลข้อมูล
- ส่ง Request ไปยัง Controller

#### Controller

- รับ Request
- ตรวจสอบสิทธิ์ผู้ใช้งาน
- เรียกใช้งาน Service

#### Service

- Business Logic
- Validation
- Workflow
- Transaction Control

#### Repository

- อ่านและเขียนข้อมูล
- ติดต่อ Google Sheets
- ติดต่อ Google Drive

#### Storage

- Google Sheets
- Google Drive

---

## 5. Design Principles

ระบบพัฒนาตามหลักการดังนี้

- Clean Architecture
- Separation of Concerns
- Single Responsibility Principle
- Repository Pattern
- Service Layer Pattern
- Reusable Components
- Configuration Driven
- Mobile First
- Production Ready

---

## 6. Technology Stack

| Layer | Technology |
| ------ | ---------- |
| Backend | Google Apps Script |
| Database | Google Sheets |
| File Storage | Google Drive |
| Mobile | LINE LIFF |
| UI | HTML Service |
| Source Control | GitHub |
| Deployment | clasp |
| IDE | Visual Studio Code |

---

## 7. Project Structure

```text
src/
├── Attendance/
├── Common/
├── Core/
├── Employee/
├── Location/

docs/
├── ADR/
├── Architecture.md

tests/

appsscript.json
.clasp.json
README.md
```