# Offices & Positions Update

Update the offices seeder with 76 offices from the new spreadsheet. Create a positions table, model, seeder (250 positions), and API endpoint. Replace the free-text `position` field on employees with a `position_id` foreign key. Make position a searchable dropdown in both admin and portal forms.

## 1. Backend — Positions Table

### Migration

Create `positions` table:
- `id` (bigIncrements)
- `title` (string, unique)
- `is_active` (boolean, default true)
- `timestamps`

Add `position_id` nullable FK on `employees` table. Migrate existing data: for each distinct `employees.position` text value, find-or-create a matching row in `positions`, then set `position_id`. Drop the `position` text column from `employees`.

### Model

`Position` model:
- `$fillable = ['title', 'is_active']`
- `$casts = ['is_active' => 'boolean']`
- `employees(): HasMany`

Update `Employee` model:
- Add `position(): BelongsTo` relationship
- Replace `position` with `position_id` in `$fillable`

### Seeder

`PositionSeeder` with all 250 position titles from the spreadsheet. Use `firstOrCreate` keyed on `title`. Add to `DatabaseSeeder` call list.

### API

`GET /v1/positions` — returns all active positions ordered by title.

`PositionController` with `index()` method mirroring `OfficeController`.

Register route in `routes/api.php` under authenticated middleware.

### Employee API updates

`EmployeeResource`: change `position` from string to object: `{ id, title }` (via the Position relationship). Handle null case.

Validation rules in `StoreEmployeeRequest` and `UpdateEmployeeRequest`: replace `'position' => 'required|string'` with `'position_id' => 'nullable|exists:positions,id'`.

Portal update endpoint (`PUT /portal/profile`): accept `position_id` instead of `position`.

## 2. Backend — Office Seeder Update

Replace the office list in `OfficeSeeder` with the 76 offices from the spreadsheet. Keep the `firstOrCreate` pattern keyed on `abbreviation`. Remove the `type` field from the seed data (spreadsheet doesn't include it). Each entry has `name`, `abbreviation`, `is_active: true`.

## 3. Frontend — Types

`types/employee.ts`:
- Add `Position` interface: `{ id: number; title: string }`
- Change `Employee.position` from `string | null` to `Position | null`
- Change `CreateEmployeeData.position` to `position_id?: number`
- Change `UpdateEmployeeData.position` to `position_id?: number`

`types/portal.ts`:
- Change `UpdatePortalProfileData.position` to `position_id?: number`

Export `Position` from `types/index.ts`.

## 4. Frontend — Positions API

New file `lib/api/positions.ts`:
```ts
positionApi.list(): Promise<{ data: Position[] }>  // GET /positions
```
Export from `lib/api/index.ts`.

## 5. Frontend — Admin Form (employees/new/page.tsx)

Replace the Position text `Input` with a searchable `Popover+Command` dropdown (same pattern as Office dropdown). Load positions on mount. Store `position_id` in form data.

## 6. Frontend — Admin Employee Detail (employees/[uuid]/page.tsx)

- Display: change `employee.position` string references to `employee.position?.title`
- Edit form: replace Position text `Input` with `Popover+Command` dropdown, same as the new employee form
- Form data: change `position: string` to `position_id: number | undefined`

## 7. Frontend — Portal Profile (portal/page.tsx)

Replace Position text `Input` with `Popover+Command` dropdown. Load positions on mount alongside offices and regions. Change `formData.position` to `formData.position_id`. Change detection compares `formData.position_id` against `profile?.position?.id`.

## 8. Frontend — Mock Data (if using mock API)

Update mock employee data: change `position: "string"` to `position: { id: N, title: "string" }` or `null`.

## Files Changed

### Backend (LGU-SSO)
- Create: `database/migrations/XXXX_create_positions_table.php`
- Create: `database/migrations/XXXX_replace_position_with_position_id_on_employees.php`
- Create: `app/Models/Position.php`
- Create: `database/seeders/PositionSeeder.php`
- Create: `app/Http/Controllers/Api/V1/PositionController.php`
- Modify: `app/Models/Employee.php` — add position() relationship, update fillable
- Modify: `database/seeders/DatabaseSeeder.php` — add PositionSeeder
- Modify: `database/seeders/OfficeSeeder.php` — replace office list with 76 new offices
- Modify: `routes/api.php` — add positions route
- Modify: `app/Http/Resources/EmployeeResource.php` — position as object
- Modify: Employee request validation files — position_id instead of position

### Frontend (lgu-sso-ui)
- Create: `lib/api/positions.ts`
- Modify: `types/employee.ts` — Position interface, Employee.position type change, CreateEmployeeData, UpdateEmployeeData
- Modify: `types/portal.ts` — position_id
- Modify: `lib/api/index.ts` — export positionApi
- Modify: `app/(dashboard)/employees/new/page.tsx` — position dropdown
- Modify: `app/(dashboard)/employees/[uuid]/page.tsx` — position display + dropdown
- Modify: `app/(portal)/portal/page.tsx` — position dropdown
- Modify: `lib/mock/data.ts` — position as object
- Modify: `lib/mock/api.ts` — position handling

## Out of Scope

- Admin UI for managing positions (CRUD) — positions managed via seeder for now
- Admin UI for managing offices (CRUD) — offices managed via seeder for now
- Position-office relationship (a position is not tied to a specific office)
