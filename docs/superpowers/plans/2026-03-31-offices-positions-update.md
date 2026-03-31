# Offices & Positions Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update offices from spreadsheet (76 offices), create a positions table/model/API (250 positions), replace the free-text position field on employees with a position_id FK, and make position a searchable dropdown in both admin and portal forms.

**Architecture:** Backend-first: create positions infrastructure (migration, model, seeder, controller, route), update office seeder, update employee resource/validation. Then frontend: update types, add positions API, convert position text inputs to searchable dropdowns in all forms.

**Tech Stack:** Laravel 11 (PHP), Next.js 16, React, Tailwind CSS, shadcn/ui, lucide-react

---

### Task 1: Create positions table and model (Backend)

**Files:**
- Create: `/Users/jsonse/Documents/development/LGU-SSO/database/migrations/2026_03_31_000001_create_positions_table.php`
- Create: `/Users/jsonse/Documents/development/LGU-SSO/app/Models/Position.php`

- [ ] **Step 1: Create the migration**

```php
<?php
// database/migrations/2026_03_31_000001_create_positions_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->string('title')->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('positions');
    }
};
```

- [ ] **Step 2: Create the Position model**

```php
<?php
// app/Models/Position.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Position extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jsonse/Documents/development/LGU-SSO
git add database/migrations/2026_03_31_000001_create_positions_table.php app/Models/Position.php
git commit -m "feat: create positions table and model"
```

---

### Task 2: Migrate employee.position text to position_id FK (Backend)

**Files:**
- Create: `/Users/jsonse/Documents/development/LGU-SSO/database/migrations/2026_03_31_000002_replace_position_with_position_id_on_employees.php`
- Modify: `/Users/jsonse/Documents/development/LGU-SSO/app/Models/Employee.php`

- [ ] **Step 1: Create the migration to replace position with position_id**

This migration:
1. Adds `position_id` nullable FK to employees
2. For each distinct `position` text value in employees, creates a positions row and updates the FK
3. Drops the `position` text column

```php
<?php
// database/migrations/2026_03_31_000002_replace_position_with_position_id_on_employees.php

use App\Models\Position;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add position_id FK
        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('position_id')->nullable()->after('office_id')->constrained()->nullOnDelete();
        });

        // Migrate existing text position values to position_id
        $distinctPositions = DB::table('employees')
            ->whereNotNull('position')
            ->where('position', '!=', '')
            ->distinct()
            ->pluck('position');

        foreach ($distinctPositions as $title) {
            $position = Position::firstOrCreate(['title' => $title]);

            DB::table('employees')
                ->where('position', $title)
                ->update(['position_id' => $position->id]);
        }

        // Drop the old text column
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('position');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('position')->nullable()->after('office_id');
        });

        // Migrate position_id back to text
        $employees = DB::table('employees')
            ->whereNotNull('position_id')
            ->get(['id', 'position_id']);

        foreach ($employees as $emp) {
            $position = DB::table('positions')->find($emp->position_id);
            if ($position) {
                DB::table('employees')
                    ->where('id', $emp->id)
                    ->update(['position' => $position->title]);
            }
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['position_id']);
            $table->dropColumn('position_id');
        });
    }
};
```

- [ ] **Step 2: Update Employee model**

In `app/Models/Employee.php`:

Replace `'position'` with `'position_id'` in the `$fillable` array.

Add the `position()` BelongsTo relationship (add the import for Position at the top):

```php
use App\Models\Position;

// Add this relationship method alongside the existing office() relationship:
public function position(): BelongsTo
{
    return $this->belongsTo(Position::class);
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jsonse/Documents/development/LGU-SSO
git add database/migrations/2026_03_31_000002_replace_position_with_position_id_on_employees.php app/Models/Employee.php
git commit -m "feat: replace employee position text with position_id FK"
```

---

### Task 3: Create PositionSeeder with 250 positions (Backend)

**Files:**
- Create: `/Users/jsonse/Documents/development/LGU-SSO/database/seeders/PositionSeeder.php`
- Modify: `/Users/jsonse/Documents/development/LGU-SSO/database/seeders/DatabaseSeeder.php`

- [ ] **Step 1: Create PositionSeeder**

```php
<?php
// database/seeders/PositionSeeder.php

namespace Database\Seeders;

use App\Models\Position;
use Illuminate\Database\Seeder;

class PositionSeeder extends Seeder
{
    public function run(): void
    {
        $positions = [
            'Accounting Services',
            'Administrative Aide I',
            'Administrative Aide I (Crafts & Trade Helper)',
            'Administrative Aide I (Laborer I)',
            'Administrative Aide I (Utility Worker I)',
            'Administrative Aide II',
            'Administrative Aide II (Bookbinder I)',
            'Administrative Aide III',
            'Administrative Aide III (Carpenter I)',
            'Administrative Aide III (Clerk I)',
            'Administrative Aide III (Driver I)',
            'Administrative Aide III (Laborer II)',
            'Administrative Aide III (Plumber I)',
            'Administrative Aide III (Utility Worker II)',
            'Administrative Aide IV',
            'Administrative Aide IV (Accounting Clerk I)',
            'Administrative Aide IV (Clerk II)',
            'Administrative Aide IV (Electrician I)',
            'Administrative Aide IV (Fiscal Clerk I)',
            'Administrative Aide IV (Human Resource Management Aide)',
            'Administrative Aide IV (Mechanic I)',
            'Administrative Aide IV (Stenographer I)',
            'Administrative Aide IV (Storekeeper I)',
            'Administrative Aide VI',
            'Administrative Aide VI (Accounting Clerk II)',
            'Administrative Aide VI (Clerk III)',
            'Administrative Aide VI (Communication Equipment Operator II)',
            'Administrative Aide VI (Mechanic II)',
            'Administrative Aide VI (Motorpool Dispatcher)',
            'Administrative Assisitant III',
            'Administrative Assisitant III (Storekeeper III)',
            'Administrative Assistant',
            'Administrative Assistant II',
            'Administrative Assistant II (Accounting Clerk III)',
            'Administrative Assistant II (Bookkeeper I)',
            'Administrative Assistant II (Budgeting Assistant)',
            'Administrative Assistant III (Senior Bookkeeper)',
            'Administrative Officer I',
            'Administrative Officer I (Records Officer I)',
            'Administrative Officer II',
            'Administrative Officer II (Accountant II)',
            'Administrative Officer II (Budget Officer I)',
            'Administrative Officer II (Information Officer I)',
            'Administrative Officer II (Management and Audit Analyst I)',
            'Administrative Officer III',
            'Administrative Officer III (Cashier II)',
            'Administrative Officer IV',
            'Administrative Officer IV (Administrative Officer II)',
            'Administrative Officer IV (Supply Officer II)',
            'Administrative Officer V',
            'Administrative Officer V (Budget Officer III)',
            'Agri Extension Services',
            'Agricultural Technologist',
            'Agriculturist I',
            'Agriculturist II',
            'Assessment Clerk I',
            'Assessment Clerk II',
            'Assistant Registration Officer',
            'Assistant Statistician I',
            'AutoCad Operation',
            'Backhoe Operator',
            'Barangay / Sports Coordination',
            'Barangay Assistance Aide',
            'Barangay Coordination',
            'Barangay Coordinator',
            'Barangay Health Aide',
            'Barangay Peacemaking Aide',
            'Board Secretary II',
            'Board Secretary III',
            'Bookkeeper I',
            'Building Inspection Services',
            'Buyer II',
            'Caretaking Service',
            'CCTV Operator',
            'Cemetery Caretaker',
            'Clerical Service',
            'Collection Service',
            'Communication-In-Charge',
            'Community Affairs Assistant I',
            'Community Affairs Assistant II',
            'Community Affairs Officer I',
            'Community Affairs Officer II',
            'Community Empowerment Facilitator',
            'Computer Maintenance Technologist I',
            'Computer Operator',
            'Computer Programmer I',
            'Construction Aide',
            'Construction and Maintenance Foreman',
            'Contact Tracing Aide',
            'Cooking Services',
            'Counseling Services',
            'Courier Services',
            'Database Manager',
            'Day Care Worker I',
            'Day Care Worker II',
            'Dental Aide',
            'Dentist II',
            'Dentist III',
            'Draftsman I',
            'Draftsman II',
            'Driving Services',
            'Eco Aide',
            'Economist I',
            'Electrical Services',
            'Electrician I',
            'Emergency Response Service',
            'Emergency Response Supervisor',
            'Enforcement Service',
            'Enforcer',
            'Engineer I',
            'Engineer II',
            'Engineer III',
            'Engineering Aide',
            'Engineering Assistance',
            'Engineering Assistant',
            'Engineering Services',
            'Engineering Supervision Service',
            'Environmental Management Specialist I',
            'Environmental Management Specialist II',
            'Executive Adviser',
            'Executive Assistant I',
            'Executive Assistant II',
            'Executive Assistant III',
            'Executive Assistant IV',
            'Facilities Maintenance Coordinator',
            'Financial Analyst',
            'Fire Aide',
            'Garbage Collection',
            'Gardening Aide',
            'General Service Assistance',
            'General Service Assistant',
            'GIS Operation',
            'Ground Marshall',
            'Groundskeeper',
            'Handyman Services',
            'Health Aide Service',
            'Health Education And Promotion Officer',
            'Heavy Equipment Helper',
            'Heavy Equipment Operation',
            'Heavy Equipment Operator I',
            'Heavy Equipment Operator II',
            'Heavy Equipment Operator III',
            'Helper',
            'Housekeeping Service',
            'Houseparent Service',
            'Human Resource Management Assistant',
            'Human Resource Management Officer II',
            'Human Resource Management Officer III',
            'Information Officer I',
            'Internal Auditor II',
            'IP Coordinator',
            'Isolation Unit Custodian',
            'IT Assistance',
            'Kitchen Assistance',
            'Laboratory Aide',
            'Landscaping Services',
            'LEDIPO',
            'Librarian I',
            'Librarian Services',
            'License Officer I',
            'Life Saver',
            'Light Equipment Operator I',
            'Local Assessment Operation Officer I',
            'Local Disaster Risk Reduction Management Assistant',
            'Local Disaster Risk Reduction Management Officer',
            'Local Disaster Risk Reduction Management Officer I',
            'Local Disaster Risk Reduction Management Officer II',
            'Local Disaster Risk Reduction Management Officer III',
            'Local Enfocer',
            'Local Legislative Staff Assistant I',
            'Local Revenue Collection Officer I',
            'Local Revenue Collection Officer II',
            'Logistics-In-Charge',
            'MAC Auxiliary',
            'Maintenance Aide',
            'Management & Audit Analyst II',
            'Market Inspector I',
            'Market Supervisor II',
            'Meat Inspection Service',
            'Meat Inspector I',
            'Mechanic Aide',
            'Mechanic II',
            'Media Production Aide',
            'Medical Officer',
            'Medical Officer II',
            'Medical Officer III',
            'Medical Service',
            'Medical Technologist',
            'Medical Technologist II',
            'Medtech Service',
            'MGADH I (Assistant Municipal Engineer)',
            'MGADH I (Special Operations Officer IV)',
            'MGAHD I (Assistant Municipal Health Officer)',
            'MGDH I (Municipal Health Officer)',
            'MGDH I (Municipal Planning And Development Coordinator)',
            'Midwife I',
            'Midwife II',
            'Midwife III',
            'Midwifery Services',
            'Motorpool Dispatcher',
            'Municipal Accountant',
            'Municipal Administrator I',
            'Municipal Agricultural Officer',
            'Municipal Agriculturist',
            'Municipal Assessor Officer',
            'Municipal Assistant Department Head I',
            'Municipal Budget Officer',
            'Municipal Civil Registrar Officer',
            'Municipal Councilor',
            'Municipal Engineer',
            'Municipal Government Assistant Department Head I',
            'Municipal Government Department Head I',
            'Municipal Government/Assistant Department Head I',
            'Municipal Health Officer',
            'Municipal Mayor',
            'Municipal Social Welfare & Development Officer',
            'Municipal Treasurer',
            'Municipal Vice - Mayor',
            'Nozzle Operator',
            'Nurse',
            'Nurse II',
            'Nurse III',
            'Nursing Service',
            'Nutrition Officer I',
            'Nutrition Program Aide',
            'Pharmacist',
            'Pharmacist II',
            'Pharmacy Assistance',
            'Pharmacy Services',
            'Physician',
            'Planning Officer III',
            'Population Program Officer I',
            'Population Program Worker II',
            'Project Development Assistant I',
            'Project Development Officer I',
            'Project Development Officer III',
            'Project Engineer',
            'Project Engineering Services',
            'Project Monitoring',
            'Purchasing Assistance',
            'Radiological Technologist I',
            'Record Officer I',
            'Recorder',
            'Registration Officer II',
            'Revenue Collection Clerk II',
            'Road Grader Operation',
            'Road Roller Operation',
            'Sangguniang Bayan Member',
            'Sangguniang Bayan Member (ABC President)',
            'Sangguniang Bayan Member (IP Representative)',
            'Sangguniang Bayan Member (Youth Representative)',
            'Sanitation Inspector II',
            'Sanitation Inspector III',
            'Sanitation Inspector V',
            'Secretary to the Sanggunian',
            'Sector Representative',
            'Security Agent I',
            'Security Guard I',
            'Security Guard II',
            'Security Officer I',
            'Security Officer II',
            'Security Service',
            'Senior Administrative Assistant I (Buyer V)',
            'Senior Administrative Assistant III (Private Secretary II)',
            'Senior Environment Management Specialist',
            'Senior Labor & Employment Officer',
            'Sewing Assistance',
            'Sewing Instructor Assistant',
            'Sewing Mechanic',
            'Slaughtering Assistant',
            'Social Welfare Aide',
            'Social Welfare Assistant',
            'Social Welfare Officer I',
            'Social Welfare Officer II',
            'Social Welfare Officer III',
            'Special Disbursing Officer',
            'Sports Coordinator',
            'Statistician Aide',
            'Statistician I',
            'Store Keeper',
            'Storekeeping',
            'Street Sweeper',
            'Supervising Agriculturist',
            'Supervising Nurse Service',
            'Surveying Service',
            'Tailoring Instruction',
            'Tax Mapper I',
            'Tax Mapping Aide',
            'Technical Assistance',
            'Tire Repair Service',
            'Tour Guide Service',
            'Tourism Operations Officer I',
            'Traffic Aide Service',
            'Traffic Education And Instruction',
            'Traffic Supervision Services',
            'Utility',
            'Veterinarian I',
            'Watchman Service',
            'Welder I',
            'Welding Service',
            'Writing Services',
            'Youth Coordination',
        ];

        foreach ($positions as $title) {
            Position::firstOrCreate(['title' => $title]);
        }
    }
}
```

- [ ] **Step 2: Add PositionSeeder to DatabaseSeeder**

In `database/seeders/DatabaseSeeder.php`, add `PositionSeeder::class` to the call array (before `EmployeeSeeder` since employees may reference positions):

```php
public function run(): void
{
    $this->call([
        OfficeSeeder::class,
        PositionSeeder::class,
        ApplicationSeeder::class,
        EmployeeSeeder::class,
    ]);
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jsonse/Documents/development/LGU-SSO
git add database/seeders/PositionSeeder.php database/seeders/DatabaseSeeder.php
git commit -m "feat: add PositionSeeder with 250 positions"
```

---

### Task 4: Update OfficeSeeder with 76 new offices (Backend)

**Files:**
- Modify: `/Users/jsonse/Documents/development/LGU-SSO/database/seeders/OfficeSeeder.php`

- [ ] **Step 1: Replace the offices array**

Replace the entire `$offices` array in `OfficeSeeder.php` with the 76 offices from the spreadsheet. Keep the `firstOrCreate` pattern keyed on `abbreviation`. Remove the `type` field.

```php
<?php

namespace Database\Seeders;

use App\Models\Office;
use Illuminate\Database\Seeder;

class OfficeSeeder extends Seeder
{
    public function run(): void
    {
        $offices = [
            ['name' => 'ABC Hall', 'abbreviation' => 'ABC', 'is_active' => true],
            ['name' => 'Bids And Awards Committee', 'abbreviation' => 'MMOAC', 'is_active' => true],
            ['name' => 'Bukidnon State University', 'abbreviation' => 'BUKSU', 'is_active' => true],
            ['name' => 'Bureau Of Fire Protection', 'abbreviation' => 'BFP', 'is_active' => true],
            ['name' => 'Bureau Of Internal Revenue', 'abbreviation' => 'BIRIR', 'is_active' => true],
            ['name' => 'Civil Security Unit', 'abbreviation' => 'MPSO-CSU', 'is_active' => true],
            ['name' => 'Civil Service Commission - Field Office', 'abbreviation' => 'CSC', 'is_active' => true],
            ['name' => 'Commission On Audit', 'abbreviation' => 'COA', 'is_active' => true],
            ['name' => 'Commission On Elections', 'abbreviation' => 'COMELEC', 'is_active' => true],
            ['name' => 'Department of Interior And Local Government', 'abbreviation' => 'DILG', 'is_active' => true],
            ['name' => 'Facilities Maintenance', 'abbreviation' => 'MEO', 'is_active' => true],
            ['name' => 'Human Resource Management Office', 'abbreviation' => 'HRMO', 'is_active' => true],
            ['name' => 'Isolation Unit', 'abbreviation' => 'MHO-IU', 'is_active' => true],
            ['name' => 'Kapit-Bisig Laban sa Kahirapan-Comprehensive and Integrated Delivery of Social Services', 'abbreviation' => 'KALAHI-CIDSS', 'is_active' => true],
            ['name' => 'Land Transportation Office - NGA', 'abbreviation' => 'NGA-LTO', 'is_active' => true],
            ['name' => 'Local Enforcement Section', 'abbreviation' => 'MPSO-LOCAL', 'is_active' => true],
            ['name' => 'Local School Board', 'abbreviation' => 'LSB', 'is_active' => true],
            ['name' => 'Local School Board - District I', 'abbreviation' => 'LSBDI', 'is_active' => true],
            ['name' => 'Local School Board - District II', 'abbreviation' => 'LSBDII', 'is_active' => true],
            ['name' => 'Local School Board - District III', 'abbreviation' => 'LSBDIII', 'is_active' => true],
            ['name' => 'Local School Board - District IV', 'abbreviation' => 'LSBDIV', 'is_active' => true],
            ['name' => 'Materials Recovery Facility', 'abbreviation' => 'MENRO-MRF', 'is_active' => true],
            ['name' => 'Municipal Accounting Office', 'abbreviation' => 'MACCO', 'is_active' => true],
            ['name' => 'Municipal Administrator\'s Office', 'abbreviation' => 'MAO-ADMIN', 'is_active' => true],
            ['name' => 'Municipal Agriculture Office', 'abbreviation' => 'MAO', 'is_active' => true],
            ['name' => 'Municipal Assessor\'s Office', 'abbreviation' => 'MASSO', 'is_active' => true],
            ['name' => 'Municipal Budget Office', 'abbreviation' => 'MBO', 'is_active' => true],
            ['name' => 'Municipal Civil Registrar Office', 'abbreviation' => 'MCRO', 'is_active' => true],
            ['name' => 'Municipal Disaster Risk Reduction And Management Office', 'abbreviation' => 'MPSO-MDRRMO', 'is_active' => true],
            ['name' => 'Municipal Engineer\'s Office', 'abbreviation' => 'MEO-ENG', 'is_active' => true],
            ['name' => 'Municipal Enterprises Management Office', 'abbreviation' => 'MEMO', 'is_active' => true],
            ['name' => 'Municipal Environment And Natural Resources Office', 'abbreviation' => 'MENRO', 'is_active' => true],
            ['name' => 'Municipal Health Office', 'abbreviation' => 'MHOHO', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office', 'abbreviation' => 'MMO', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - General Services Division', 'abbreviation' => 'MMO-GSD', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Heritage Hall', 'abbreviation' => 'MMO-HERITAGE', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Management Information System Section', 'abbreviation' => 'MMO-MISS', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Personal Staff', 'abbreviation' => 'MMO-PS', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Property Supply Management Division', 'abbreviation' => 'MMO-PSMD', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Public Affairs, Information And Assistance Division', 'abbreviation' => 'MMO-PAIAD', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Security', 'abbreviation' => 'MOS', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Barangay Affairs', 'abbreviation' => 'MMO-BA', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Business Permits And Licensing Division', 'abbreviation' => 'MMO-BPLD', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Community Affairs', 'abbreviation' => 'MMO-CA', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - ECCCO', 'abbreviation' => 'MMO-ECCCO', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Internal Audit', 'abbreviation' => 'MMO-IA', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - LCS', 'abbreviation' => 'MMO-LCS', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Local Economic Development and Investment Promotions Office', 'abbreviation' => 'MMO-LEDIPO', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Livelihood Division', 'abbreviation' => 'MMO-LIVELIHOOD', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Mayor\'s Action Center', 'abbreviation' => 'MMO-MAC', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Policy Development', 'abbreviation' => 'MMO-PD', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - PRDP', 'abbreviation' => 'MMO-PRDP', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Public Information Section', 'abbreviation' => 'MMO-PIS', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Purchasing Section', 'abbreviation' => 'MMO-PS-PURCH', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Secretariat Section', 'abbreviation' => 'MMO-SS', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Service Vehicle Pool', 'abbreviation' => 'MMO-SVP', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Shooting Range', 'abbreviation' => 'MMO-SR', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Tourism And Civil Affairs Section', 'abbreviation' => 'MMO-TCAS', 'is_active' => true],
            ['name' => 'Municipal Mayor\'s Office - Youth Development Section', 'abbreviation' => 'MMO-YDS', 'is_active' => true],
            ['name' => 'Municipal Planning And Development Office', 'abbreviation' => 'MPDO', 'is_active' => true],
            ['name' => 'Municipal Project Monitoring', 'abbreviation' => 'MMO-MPM', 'is_active' => true],
            ['name' => 'Municipal Public Safety Office', 'abbreviation' => 'MPSO', 'is_active' => true],
            ['name' => 'Municipal Social Welfare And Development Office', 'abbreviation' => 'MSWDO', 'is_active' => true],
            ['name' => 'Municipal Treasurer\'s Office', 'abbreviation' => 'MTO', 'is_active' => true],
            ['name' => 'Nutrition Division', 'abbreviation' => 'MHO-NUTRITION', 'is_active' => true],
            ['name' => 'Philippine Drug Enforcement Agency', 'abbreviation' => 'NGA-PDEA', 'is_active' => true],
            ['name' => 'Philippine National Police', 'abbreviation' => 'PNP', 'is_active' => true],
            ['name' => 'Population Development Division', 'abbreviation' => 'MHO-POPDEV', 'is_active' => true],
            ['name' => 'Post Office', 'abbreviation' => 'PHILPOST', 'is_active' => true],
            ['name' => 'Provincial Prosecutor\'s Office', 'abbreviation' => 'PPO', 'is_active' => true],
            ['name' => 'Public Attorney\'s Office', 'abbreviation' => 'PAO', 'is_active' => true],
            ['name' => 'Public Employment Service Office', 'abbreviation' => 'PESO', 'is_active' => true],
            ['name' => 'Quezon Health Center Infirmary', 'abbreviation' => 'MHO-QHCI', 'is_active' => true],
            ['name' => 'Sangguniang Bayan\'s Office', 'abbreviation' => 'SBO', 'is_active' => true],
            ['name' => 'Solid Waste Management Program Office', 'abbreviation' => 'MENRO-SWMPO', 'is_active' => true],
            ['name' => 'Traffic Management Group', 'abbreviation' => 'MPSO-TMG', 'is_active' => true],
        ];

        foreach ($offices as $office) {
            Office::firstOrCreate(
                ['abbreviation' => $office['abbreviation']],
                $office
            );
        }
    }
}
```

Note: The spreadsheet has duplicate abbreviations for "Municipal Administrator's Office" and "Municipal Agriculture Office" (both "MAO") and "Facilities Maintenance" and "Municipal Engineer's Office" (both "MEO"). We deduplicate by appending suffixes: `MAO-ADMIN` for Administrator's Office and `MEO-ENG` for Engineer's Office. Similarly "MMO-PS" is used by both Personal Staff and Purchasing Section — Purchasing gets `MMO-PS-PURCH`.

- [ ] **Step 2: Commit**

```bash
cd /Users/jsonse/Documents/development/LGU-SSO
git add database/seeders/OfficeSeeder.php
git commit -m "feat: update OfficeSeeder with 76 offices from spreadsheet"
```

---

### Task 5: Create PositionController and API route (Backend)

**Files:**
- Create: `/Users/jsonse/Documents/development/LGU-SSO/app/Http/Controllers/Api/V1/PositionController.php`
- Modify: `/Users/jsonse/Documents/development/LGU-SSO/routes/api.php`

- [ ] **Step 1: Create PositionController**

```php
<?php
// app/Http/Controllers/Api/V1/PositionController.php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Position;

class PositionController extends Controller
{
    public function index()
    {
        $positions = Position::where('is_active', true)
            ->orderBy('title')
            ->get();

        return response()->json(['data' => $positions]);
    }
}
```

- [ ] **Step 2: Add route in routes/api.php**

Add the positions route alongside the existing offices route. Find the line:

```php
Route::get('offices', [OfficeController::class, 'index']);
```

Add after it:

```php
Route::get('positions', [PositionController::class, 'index']);
```

Add the import at the top of the file:

```php
use App\Http\Controllers\Api\V1\PositionController;
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jsonse/Documents/development/LGU-SSO
git add app/Http/Controllers/Api/V1/PositionController.php routes/api.php
git commit -m "feat: add positions API endpoint"
```

---

### Task 6: Update EmployeeResource and validation (Backend)

**Files:**
- Modify: `/Users/jsonse/Documents/development/LGU-SSO/app/Http/Resources/EmployeeResource.php`
- Modify: `/Users/jsonse/Documents/development/LGU-SSO/app/Http/Requests/Employee/StoreEmployeeRequest.php`
- Modify: `/Users/jsonse/Documents/development/LGU-SSO/app/Http/Requests/Employee/UpdateEmployeeRequest.php`
- Modify: `/Users/jsonse/Documents/development/LGU-SSO/app/Http/Controllers/Api/V1/PortalController.php`

- [ ] **Step 1: Update EmployeeResource to return position as object**

In `app/Http/Resources/EmployeeResource.php`, change line 37 from:

```php
'position' => $this->position,
```

to:

```php
'position' => $this->whenLoaded('position', fn () => [
    'id' => $this->position->id,
    'title' => $this->position->title,
]),
```

- [ ] **Step 2: Ensure position is eager-loaded everywhere employees are returned**

In `app/Http/Controllers/Api/V1/PortalController.php`, update both methods that load employee relationships.

In `profile()` method, change:
```php
$employee->load(['office', 'applications']);
```
to:
```php
$employee->load(['office', 'position', 'applications']);
```

In `updateProfile()` method, change:
```php
$employee->load(['office', 'applications']);
```
to:
```php
$employee->load(['office', 'position', 'applications']);
```

Also in `updateProfile()`, change the position validation rule from:
```php
'position' => ['sometimes', 'nullable', 'string', 'max:255'],
```
to:
```php
'position_id' => ['sometimes', 'nullable', 'integer', 'exists:positions,id'],
```

Add `suffix`, `office_id`, and `date_employed` to the portal validation if not already present:
```php
'suffix' => ['sometimes', 'nullable', 'string', 'max:50'],
'office_id' => ['sometimes', 'nullable', 'integer', 'exists:offices,id'],
'date_employed' => ['sometimes', 'nullable', 'date'],
```

- [ ] **Step 3: Update StoreEmployeeRequest**

In `app/Http/Requests/Employee/StoreEmployeeRequest.php`, change:
```php
'position' => ['required', 'string', 'max:255'],
```
to:
```php
'position_id' => ['nullable', 'integer', 'exists:positions,id'],
```

- [ ] **Step 4: Update UpdateEmployeeRequest**

In `app/Http/Requests/Employee/UpdateEmployeeRequest.php`, change:
```php
'position' => ['sometimes', 'string', 'max:255'],
```
to:
```php
'position_id' => ['sometimes', 'nullable', 'integer', 'exists:positions,id'],
```

- [ ] **Step 5: Ensure EmployeeController eager-loads position**

Search for any `->load(` or `::with(` calls in the EmployeeController and add `'position'` to the relationship list. Typically this is in index, show, store, update methods.

Run: `grep -n "load\|::with" /Users/jsonse/Documents/development/LGU-SSO/app/Http/Controllers/Api/V1/EmployeeController.php`

Add `'position'` alongside `'office'` in any relationship loading calls.

- [ ] **Step 6: Commit**

```bash
cd /Users/jsonse/Documents/development/LGU-SSO
git add app/Http/Resources/EmployeeResource.php app/Http/Requests/Employee/StoreEmployeeRequest.php app/Http/Requests/Employee/UpdateEmployeeRequest.php app/Http/Controllers/Api/V1/PortalController.php app/Http/Controllers/Api/V1/EmployeeController.php
git commit -m "feat: update employee resource/validation for position_id FK"
```

---

### Task 7: Run migrations and seed (Backend)

- [ ] **Step 1: Run migrations inside the Docker container**

```bash
docker exec lgu-sso php artisan migrate --force
```

Expected: Two new migrations run (create positions table, replace position with position_id on employees).

- [ ] **Step 2: Run the position seeder**

```bash
docker exec lgu-sso php artisan db:seed --class=PositionSeeder --force
```

Expected: 250 positions created.

- [ ] **Step 3: Run the office seeder**

```bash
docker exec lgu-sso php artisan db:seed --class=OfficeSeeder --force
```

Expected: New offices created (existing ones preserved via firstOrCreate).

- [ ] **Step 4: Clear config cache**

```bash
docker exec lgu-sso php artisan config:cache
docker exec lgu-sso php artisan route:cache
```

- [ ] **Step 5: Verify the API works**

```bash
docker exec lgu-sso php artisan tinker --execute="echo \App\Models\Position::count();"
docker exec lgu-sso php artisan tinker --execute="echo \App\Models\Office::count();"
```

Expected: Position count >= 250, Office count >= 76.

---

### Task 8: Update frontend types (Frontend)

**Files:**
- Modify: `/Users/jsonse/Documents/development/lgu-sso-ui/types/employee.ts`
- Modify: `/Users/jsonse/Documents/development/lgu-sso-ui/types/portal.ts`

- [ ] **Step 1: Add Position interface and update Employee type**

In `types/employee.ts`:

Add `Position` interface after the `Office` interface:

```ts
export interface Position {
  id: number;
  title: string;
}
```

Change the `Employee` interface:
```ts
// Change:
position: string | null;
// To:
position: Position | null;
```

Change `CreateEmployeeData`:
```ts
// Change:
position: string;
// To:
position_id?: number;
```

Change `UpdateEmployeeData`:
```ts
// Change:
position?: string;
// To:
position_id?: number;
```

- [ ] **Step 2: Update UpdatePortalProfileData**

In `types/portal.ts`, change:
```ts
position?: string;
position_id?: number;
```
Wait — replace `position?: string;` with `position_id?: number;`.

Also add `office_id` and `date_employed` if not already there:
```ts
office_id?: number;
date_employed?: string;
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-sso-ui
git add types/employee.ts types/portal.ts
git commit -m "feat: add Position type, update Employee/CreateEmployeeData/UpdatePortalProfileData for position_id"
```

---

### Task 9: Add positions API service (Frontend)

**Files:**
- Create: `/Users/jsonse/Documents/development/lgu-sso-ui/lib/api/positions.ts`
- Modify: `/Users/jsonse/Documents/development/lgu-sso-ui/lib/api/index.ts`

- [ ] **Step 1: Create positions API service**

```ts
// lib/api/positions.ts
import { apiClient } from "./client";
import { Position } from "@/types";

export const positionApi = {
  async list(): Promise<{ data: Position[] }> {
    return apiClient.get<{ data: Position[] }>("/positions");
  },
};
```

- [ ] **Step 2: Add to api/index.ts**

In `lib/api/index.ts`:

Add the import:
```ts
import { positionApi } from "./positions";
```

Add to the `api` object:
```ts
positions: positionApi,
```

Add to the export line at the bottom:
```ts
export { authApi, employeeApi, applicationApi, auditApi, locationApi, officeApi, positionApi, statsApi };
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-sso-ui
git add lib/api/positions.ts lib/api/index.ts
git commit -m "feat: add positions API service"
```

---

### Task 10: Update admin new employee form — position dropdown (Frontend)

**Files:**
- Modify: `/Users/jsonse/Documents/development/lgu-sso-ui/app/(dashboard)/employees/new/page.tsx`

- [ ] **Step 1: Add positions state and imports**

Add `Position` to the types import:
```ts
import { CreateEmployeeData, Office, Position } from "@/types";
```

Add state:
```ts
const [positions, setPositions] = useState<Position[]>([]);
```

Add popover state:
```ts
const [positionOpen, setPositionOpen] = useState(false);
```

Update `formData` initial state — change `position: ""` to `position_id: undefined`.

Load positions in the `useEffect`:
```ts
// Add after offices loading:
try {
  const positionsRes = await api.positions.list();
  setPositions(positionsRes.data);
} catch {
  // Positions endpoint not available, continue without it
}
```

- [ ] **Step 2: Replace position Input with Popover+Command dropdown**

Replace the position `<div className="space-y-2">` block (the one with `<Label htmlFor="position">` and `<Input id="position" ...>`) with:

```tsx
<div className="space-y-2">
  <Label>
    Position
  </Label>
  <Popover open={positionOpen} onOpenChange={setPositionOpen}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={positionOpen}
        className="w-full justify-between font-normal"
      >
        {formData.position_id
          ? positions.find((p) => p.id === formData.position_id)?.title
          : "Select position"}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
      <Command>
        <CommandInput placeholder="Search position..." />
        <CommandList>
          <CommandEmpty>No position found.</CommandEmpty>
          <CommandGroup>
            {positions.map((p) => (
              <CommandItem
                key={p.id}
                value={p.title}
                onSelect={() => {
                  setFormData({ ...formData, position_id: p.id });
                  setPositionOpen(false);
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    formData.position_id === p.id ? "opacity-100" : "opacity-0"
                  }`}
                />
                {p.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</div>
```

- [ ] **Step 3: Update validation**

In the `validate()` function, remove the position validation (it was `if (!formData.position)` — position is now optional via dropdown).

- [ ] **Step 4: Update sanitizedData**

In `handleSubmit`, change position handling in `sanitizedData`:
```ts
// Remove: position: formData.position || null,
// The position_id is already in formData and will be sent as-is
position_id: formData.position_id || null,
```

- [ ] **Step 5: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-sso-ui
git add app/\(dashboard\)/employees/new/page.tsx
git commit -m "feat: replace position text input with searchable dropdown in admin new employee form"
```

---

### Task 11: Update admin employee detail/edit page — position dropdown (Frontend)

**Files:**
- Modify: `/Users/jsonse/Documents/development/lgu-sso-ui/app/(dashboard)/employees/[uuid]/page.tsx`

- [ ] **Step 1: Add position state and imports**

Add `Position` to the types import. Add state:
```ts
const [positions, setPositions] = useState<Position[]>([]);
const [positionOpen, setPositionOpen] = useState(false);
```

Load positions in the initial data loading `useEffect`.

- [ ] **Step 2: Update form data initialization**

Change:
```ts
position: employeeRes.data.position || "",
```
to:
```ts
position_id: employeeRes.data.position?.id || undefined,
```

- [ ] **Step 3: Update position display strings**

Change all references of `employee.position` (as a string) to `employee.position?.title`:

```ts
// Line ~309-311: Change:
{employee.position && employee.office
  ? `${employee.position} - ${employee.office.abbreviation}`
  : employee.position || employee.email}
// To:
{employee.position?.title && employee.office
  ? `${employee.position.title} - ${employee.office.abbreviation}`
  : employee.position?.title || employee.email}

// Line ~313: Change:
{(employee.position || employee.office) && (
// To:
{(employee.position?.title || employee.office) && (
```

- [ ] **Step 4: Replace position Input with dropdown in edit form**

Replace the position `<Input>` with the same `Popover+Command` dropdown pattern as Task 10 Step 2, using `formData.position_id` and `setFormData({ ...formData, position_id: p.id })`.

- [ ] **Step 5: Update form data type**

In the component's form data type/interface, change `position: string` to `position_id: number | undefined`.

- [ ] **Step 6: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-sso-ui
git add app/\(dashboard\)/employees/\\[uuid\\]/page.tsx
git commit -m "feat: replace position text input with searchable dropdown in admin employee detail page"
```

---

### Task 12: Update portal profile form — position dropdown (Frontend)

**Files:**
- Modify: `/Users/jsonse/Documents/development/lgu-sso-ui/app/(portal)/portal/page.tsx`

- [ ] **Step 1: Add position state and imports**

Add `Position` import. Add state:
```ts
const [positions, setPositions] = useState<Position[]>([]);
const [positionOpen, setPositionOpen] = useState(false);
```

Load positions in the mount `useEffect`:
```ts
api.positions.list().then((res) => setPositions(res.data)).catch(() => {});
```

- [ ] **Step 2: Update FormData interface**

Change `position: string` to `position_id: number | undefined`.

- [ ] **Step 3: Update formData initialization, handleCancel, loadProfile**

In all three places where formData is set:
```ts
// Change:
position: data.position || "",
// To:
position_id: data.position?.id || undefined,
```

And in handleCancel:
```ts
// Change:
position: profile.position || "",
// To:
position_id: profile.position?.id || undefined,
```

- [ ] **Step 4: Update handleSave change detection**

Change:
```ts
if (formData.position !== (profile.position || "")) changes.position = formData.position;
```
to:
```ts
if (formData.position_id !== (profile.position?.id || undefined)) changes.position_id = formData.position_id;
```

- [ ] **Step 5: Replace position Input with dropdown in Employment Information card**

Replace the position `<Input>` block with the same `Popover+Command` dropdown:

```tsx
<div className="space-y-2">
  <Label>Position</Label>
  <Popover open={positionOpen} onOpenChange={setPositionOpen}>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={positionOpen}
        className="w-full justify-between font-normal"
      >
        {formData.position_id
          ? positions.find((p) => p.id === formData.position_id)?.title
          : "Select position"}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
      <Command>
        <CommandInput placeholder="Search position..." />
        <CommandList>
          <CommandEmpty>No position found.</CommandEmpty>
          <CommandGroup>
            {positions.map((p) => (
              <CommandItem
                key={p.id}
                value={p.title}
                onSelect={() => {
                  setFormData((prev) => ({ ...prev, position_id: p.id }));
                  setPositionOpen(false);
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${
                    formData.position_id === p.id ? "opacity-100" : "opacity-0"
                  }`}
                />
                {p.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</div>
```

- [ ] **Step 6: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-sso-ui
git add app/\(portal\)/portal/page.tsx
git commit -m "feat: replace position text input with searchable dropdown in portal profile"
```

---

### Task 13: Rebuild and restart Docker containers

- [ ] **Step 1: Rebuild both images**

```bash
cd /Users/jsonse/Documents/development && docker compose build lgu-sso lgu-sso-ui
```

- [ ] **Step 2: Restart containers**

```bash
cd /Users/jsonse/Documents/development && docker compose up -d lgu-sso lgu-sso-ui
```

- [ ] **Step 3: Verify startup**

```bash
docker compose logs lgu-sso --tail 20
```

Expected: Migrations run, server starts on port 8000.

- [ ] **Step 4: Verify positions API**

```bash
curl -s http://localhost:8000/api/v1/positions | head -c 200
```

Expected: JSON with position data.
