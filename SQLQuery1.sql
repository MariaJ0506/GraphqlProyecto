USE master;
GO
IF DB_ID(N'Project') IS NULL
    CREATE DATABASE [Project];
GO
USE [Project];
GO


/* ------------------------------------------------------------
                DATABASE CLEANUP
   ------------------------------------------------------------ */

IF OBJECT_ID('dbo.TR_ApplicationLimitPerMonth','TR') IS NOT NULL DROP TRIGGER dbo.TR_ApplicationLimitPerMonth;
IF OBJECT_ID('dbo.Applications','U') IS NOT NULL DROP TABLE dbo.Applications;
IF OBJECT_ID('dbo.Vacancies','U') IS NOT NULL DROP TABLE dbo.Vacancies;

IF OBJECT_ID('dbo.Resume_Experience','U') IS NOT NULL DROP TABLE dbo.Resume_Experience;
IF OBJECT_ID('dbo.Resume_Titles','U') IS NOT NULL DROP TABLE dbo.Resume_Titles;
IF OBJECT_ID('dbo.Resume_Header','U') IS NOT NULL DROP TABLE dbo.Resume_Header;

IF OBJECT_ID('dbo.Offeror_Services','U') IS NOT NULL DROP TABLE dbo.Offeror_Services;
IF OBJECT_ID('dbo.Offerors','U') IS NOT NULL DROP TABLE dbo.Offerors;
IF OBJECT_ID('dbo.Services','U') IS NOT NULL DROP TABLE dbo.Services;
IF OBJECT_ID('dbo.Employers','U') IS NOT NULL DROP TABLE dbo.Employers;
GO


/* ------------------------------------------------------------
                        MAIN TABLES
   ------------------------------------------------------------ */

-- Employers (natural person or legal entity)
CREATE TABLE dbo.Employers (
    employer_id INT PRIMARY KEY,
    employer_type VARCHAR(10) NOT NULL CHECK (employer_type IN ('Natural','Legal')),
    first_name VARCHAR(50),
    last_name VARCHAR(20),
    middle_name VARCHAR(20),
    company_name VARCHAR(50),
    tax_id VARCHAR(20),
    position VARCHAR(30)
);

-- Services/Professions catalog
CREATE TABLE dbo.Services (
    service_id INT PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL
);

-- Offerors (natural or legal person)
CREATE TABLE dbo.Offerors (
    id INT PRIMARY KEY NOT NULL,
    offeror_type VARCHAR(10) NOT NULL CHECK (offeror_type IN ('Natural','Legal')),
    first_name VARCHAR(20),
    last_name VARCHAR(20),
    email VARCHAR(40),
    company_name VARCHAR(30),
    tax_id VARCHAR(20),
    gender VARCHAR(10) NULL   -- for report #6
);

-- Many-to-many relationship between offerors and services
CREATE TABLE dbo.Offeror_Services (
    offeror_id INT NOT NULL,
    service_id INT NOT NULL,
    CONSTRAINT PK_Offeror_Services PRIMARY KEY (offeror_id, service_id),
    CONSTRAINT FK_OfferServ_Offer FOREIGN KEY (offeror_id) REFERENCES dbo.Offerors(id),
    CONSTRAINT FK_OfferServ_Serv FOREIGN KEY (service_id) REFERENCES dbo.Services(service_id)
);
GO


/* ------------------------------------------------------------
                            RESUME
   ------------------------------------------------------------ */


CREATE TABLE dbo.Resume_Header (
    resume_id INT IDENTITY PRIMARY KEY,
    offeror_id INT NOT NULL,
    summary VARCHAR(500) NULL,
    FOREIGN KEY (offeror_id) REFERENCES dbo.Offerors(id)
);

CREATE TABLE dbo.Resume_Titles (
    title_id INT IDENTITY PRIMARY KEY,
    resume_id INT NOT NULL,
    title_name VARCHAR(100) NOT NULL,
    institution VARCHAR(100) NULL,
    year INT NULL,
    FOREIGN KEY (resume_id) REFERENCES dbo.Resume_Header(resume_id)
);

CREATE TABLE dbo.Resume_Experience (
    exp_id INT IDENTITY PRIMARY KEY,
    resume_id INT NOT NULL,
    company VARCHAR(100) NOT NULL,
    position VARCHAR(80) NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NULL,
    description VARCHAR(400) NULL,
    FOREIGN KEY (resume_id) REFERENCES dbo.Resume_Header(resume_id)
);
GO


/* ------------------------------------------------------------
                            VACANCIES
   ------------------------------------------------------------ */


CREATE TABLE dbo.Vacancies (
    vacancy_id INT IDENTITY PRIMARY KEY,
    employer_id INT NOT NULL,
    service_id INT NOT NULL,        
    title VARCHAR(100) NOT NULL,
    location VARCHAR(100) NULL,
    publish_date DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    FOREIGN KEY (employer_id) REFERENCES dbo.Employers(employer_id),
    FOREIGN KEY (service_id) REFERENCES dbo.Services(service_id)
);
CREATE INDEX IX_Vac_Service_Date ON dbo.Vacancies(service_id, publish_date DESC);
GO


/* ------------------------------------------------------------
           APPLICATIONS + Business rule (3 per month)
   ------------------------------------------------------------ */


CREATE TABLE dbo.Applications (
    application_id INT IDENTITY PRIMARY KEY,
    offeror_id INT NOT NULL,
    vacancy_id INT NOT NULL,
    application_date DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    status VARCHAR(20) NOT NULL DEFAULT 'APPLIED', -- APPLIED/IN_REVIEW/REJECTED/SELECTED
    FOREIGN KEY (offeror_id) REFERENCES dbo.Offerors(id),
    FOREIGN KEY (vacancy_id) REFERENCES dbo.Vacancies(vacancy_id),
    CONSTRAINT UQ_Application UNIQUE (offeror_id, vacancy_id)
);
CREATE INDEX IX_App_Offeror_Month ON dbo.Applications(offeror_id, application_date);
GO

-- Trigger that limits 3 applications/month per offeror
CREATE OR ALTER TRIGGER dbo.TR_ApplicationLimitPerMonth
ON dbo.Applications
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM (
            SELECT 
                a.offeror_id,
                DATEFROMPARTS(YEAR(a.application_date), MONTH(a.application_date), 1) AS MonthKey
            FROM dbo.Applications AS a
            WHERE EXISTS (
                SELECT 1
                FROM inserted AS i
                WHERE i.offeror_id = a.offeror_id
                  AND YEAR(i.application_date) = YEAR(a.application_date)
                  AND MONTH(i.application_date) = MONTH(a.application_date)
            )
            GROUP BY a.offeror_id, DATEFROMPARTS(YEAR(a.application_date), MONTH(a.application_date), 1)
            HAVING COUNT(*) > 3
        ) AS OverLimit
    )
    BEGIN
        RAISERROR('Monthly application limit (3) reached.', 16, 1);
        ROLLBACK TRANSACTION;  -- cancels the INSERT that exceeded the limit
        RETURN;
    END
END;
GO


/* ------------------------------------------------------------
                        TEST DATA
   ------------------------------------------------------------ */


INSERT INTO dbo.Services(service_id, service_name)
VALUES (1,'IT'),(2,'Electrician'),(3,'Accounting'),(4,'Administration');

INSERT INTO dbo.Employers(employer_id, employer_type, company_name, tax_id, position)
VALUES (1,'Legal','ACME Inc.','3-101-123456','HR');

INSERT INTO dbo.Offerors(id, offeror_type, first_name, last_name, email, gender)
VALUES (1,'Natural','Maria','Gomez','maria@mail.com','F');

INSERT INTO dbo.Offeror_Services(offeror_id, service_id) VALUES (1,1), (1,3);

INSERT INTO dbo.Resume_Header(offeror_id, summary)
VALUES (1,'Bachelor in IT (UTN). Experience in SQL and Node.js.');
DECLARE @resumeId INT = SCOPE_IDENTITY();
INSERT INTO dbo.Resume_Titles(resume_id, title_name, institution, year)
VALUES (@resumeId,'CCNA','Cisco',2023);
INSERT INTO dbo.Resume_Experience(resume_id, company, position, date_from, date_to, description)
VALUES (@resumeId,'Tech SA','Developer','2022-01-01',NULL,'Backend development and SQL queries');

INSERT INTO dbo.Vacancies(employer_id, service_id, title, location)
VALUES (1,1,'Junior Developer','Puntarenas'),
       (1,2,'Electric Technician','Esparza'),
       (1,1,'QA Junior','Miramar');

INSERT INTO dbo.Applications(offeror_id, vacancy_id, application_date) VALUES (1,1,'2025-08-05');
INSERT INTO dbo.Applications(offeror_id, vacancy_id, application_date) VALUES (1,2,'2025-08-06');
INSERT INTO dbo.Applications(offeror_id, vacancy_id, application_date) VALUES (1,3,'2025-08-07');

-- TEST rule (uncomment to see controlled error):
-- INSERT INTO dbo.Applications(offeror_id, vacancy_id, application_date) VALUES (1,1,'2025-08-15');
-- Expected: "Monthly application limit (3) reached."
GO


/* ------------------------------------------------------------
                           REPORTS
   ------------------------------------------------------------ */


-- REPORT 1: Employers with number of job postings
PRINT 'REPORT 1: Employers with number of job postings';
SELECT 
    e.employer_id,
    e.tax_id,
    COALESCE(e.company_name,
             CONCAT(e.first_name,' ',e.last_name,' ',e.middle_name)) AS name,
    COUNT(v.vacancy_id) AS job_posted
FROM dbo.Employers e
LEFT JOIN dbo.Vacancies v ON v.employer_id = e.employer_id
GROUP BY e.employer_id, e.tax_id, e.company_name,
         e.first_name, e.last_name, e.middle_name
ORDER BY job_posted DESC, name;
GO

-- REPORT 2: Professional (data + professions)
PRINT 'REPORT 2: Professional (data + professions)';
DECLARE @OfferorId INT = 1;  
SELECT 
    o.id AS offeror_id,
    o.tax_id,
    COALESCE(o.company_name, CONCAT(o.first_name,' ',o.last_name)) AS name,
    STRING_AGG(s.service_name, ', ') WITHIN GROUP (ORDER BY s.service_name) AS professions
FROM dbo.Offerors o
LEFT JOIN dbo.Offeror_Services os ON os.offeror_id = o.id
LEFT JOIN dbo.Services s ON s.service_id = os.service_id
WHERE o.id = @OfferorId
GROUP BY o.id, o.tax_id, o.company_name, o.first_name, o.last_name;
GO

-- REPORT 3: Vacancies inventory
PRINT 'REPORT 3: Vacancies inventory';
SELECT 
    v.vacancy_id,
    v.title,
    s.service_name AS area,
    v.location,
    v.publish_date,
    COALESCE(e.company_name,
             CONCAT(e.first_name,' ',e.last_name,' ',e.middle_name)) AS employer
FROM dbo.Vacancies v
JOIN dbo.Services s ON s.service_id = v.service_id
JOIN dbo.Employers e ON e.employer_id = v.employer_id
ORDER BY v.publish_date DESC, v.vacancy_id DESC;
GO

-- REPORT 4: Applicants by selected area
PRINT 'REPORT 4: Applicants by selected area';
DECLARE @AreaId INT = 1;  
SELECT DISTINCT 
    COALESCE(o.company_name, CONCAT(o.first_name,' ',o.last_name)) AS applicant
FROM dbo.Applications a
JOIN dbo.Vacancies v ON v.vacancy_id = a.vacancy_id
JOIN dbo.Offerors o ON o.id = a.offeror_id
WHERE v.service_id = @AreaId
ORDER BY applicant;
GO

-- REPORT 5: Professionals by area (count and %)
PRINT 'REPORT 5: Professionals by area (count and %)';
SELECT 
    s.service_name AS area,
    COUNT(*) AS quantity,
    CONVERT(DECIMAL(5,2),
            100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0)) AS percentage
FROM dbo.Offeror_Services os
JOIN dbo.Services s ON s.service_id = os.service_id
GROUP BY s.service_name
ORDER BY quantity DESC, area;
GO

-- REPORT 6: Professionals by gender
PRINT 'REPORT 6: Professionals by gender';
SELECT 
    ISNULL(o.gender, 'Not specified') AS gender,
    COUNT(*) AS quantity
FROM dbo.Offerors o
GROUP BY ISNULL(o.gender, 'Not specified')
ORDER BY quantity DESC;
GO
