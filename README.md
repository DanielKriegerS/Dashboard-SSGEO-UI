# DashboardSSGEOUi

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.13.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Planner weekends

Saturday and Sunday columns have a different background and explicit weekday
labels. Weekend cells remain clickable, including cells that already contain
activities and placeholder rows. New activities have an unchecked **Incluir fins
de semana e feriados** option. When checked, every date in the inclusive range
is saved. Otherwise, weekends and Brazilian fixed-date national holidays are
excluded: January 1, April 21, May 1, September 7, October 12, November 2 and 15,
November 20 (from 2024), and December 25. Local and movable holidays are not
included in this calendar.

Working days are grouped into consecutive periods and saved atomically through
`POST /coatends/{coatendId}/timeline/batch`. October 9-15, 2026 therefore creates
October 9 and October 13-15 as two separate entries. Each entry can be edited
independently. A range with no working days cannot be submitted unless inclusion
is enabled. Blocks are checked only against included periods. Existing entries
and editing retain their previous behavior; weekend warnings remain available
when including weekends or editing an existing entry.

## Planner blocks

Use **Adicionar bloqueio**, or click a timeline cell and choose **Registro =
Bloqueio**, to create a block. The **Bloqueios (N)** panel lists all blocks,
including those outside the visible dates; click a list item or a BC/BD marker
to edit it.

- **BC / CORPORATE:** global; prevents PRE_SWAP and SWAP on every Coatend.
- **BD / DEPENDENCY:** prevents every activity on the selected Coatend.
- Both dates are inclusive. The activity modal explains matching blocks and
  prevents submission until the activity is moved or the block is edited.
- Creating or editing blocks preserves existing activities. Conflict markers
  and the summary use the backend's `conflictingActivityIds`. Overlapping
  blocks do not count the same activity twice in the summary.

The frontend uses `GET /blocks`, `POST /blocks` and `PUT /blocks/{id}`. Corporate
requests send `coatendId: null`; dependency requests send the selected Coatend ID.
There is no delete endpoint. Excel exports include corporate blocks in global
rows and dependency blocks below their selected Coatend, using `Bl` markers and
the planner block colors. Dates are clipped to the export window; activity rows
remain visible even when blocks overlap. API errors remain visible through
planner feedback.

Focused block/planner validation:

```bash
npm test -- --watch=false --ts-config=tsconfig.planner.spec.json --include=src/app/core/main/main/main.spec.ts --include=src/app/core/layout/planner/planner.spec.ts --include=src/app/core/layout/planner-placeholder-actions/planner-placeholder-actions.spec.ts --include=src/app/services/planning-block.spec.ts --include=src/app/shared/utils/planner-blocks.spec.ts
```

## Planner Excel export

The **Exportar** button above the planner opens export options for a day count,
a date period, a complete Quarter, or a complete Sprint. Count and period are
initially populated from the current planner window, including arrow navigation.
Changing export options does not change the planner display.

The frontend downloads `planner.xlsx` from `GET /planner/export` on the configured
backend. It sends only the parameters for the chosen mode: `COUNT` with
`startDate` and `count`, `PERIOD` with `startDate` and `endDate`, `QUARTER` with
`quarterId`, or `SPRINT` with `sprintId`. Dates use `yyyy-MM-dd`. The workbook
content, formatting and date clipping are determined by the backend. Count and
period exports support up to 16,383 days; server errors are shown through the
existing feedback component.

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
