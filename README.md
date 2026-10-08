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
