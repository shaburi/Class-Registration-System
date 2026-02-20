-- Migration: Add Programme Section Links Table
-- Description: Creates a visibility layer for sections per programme.
-- Sections are shared; this table acts as a "bookmark" so each programme
-- can independently link/unlink sections without affecting other programmes.

-- Programme Section Links table
CREATE TABLE IF NOT EXISTS programme_section_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme VARCHAR(100) NOT NULL,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_programme_section UNIQUE(programme, section_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_psl_programme ON programme_section_links(programme);
CREATE INDEX IF NOT EXISTS idx_psl_section_id ON programme_section_links(section_id);

-- Seed: Link ALL existing sections to their relevant programmes
-- For each section, link it to:
--   1. The subject's own programme field
--   2. Any programme that references the subject via program_structure_courses
INSERT INTO programme_section_links (programme, section_id)
SELECT DISTINCT all_progs.programme, sec.id
FROM sections sec
JOIN subjects sub ON sec.subject_id = sub.id
CROSS JOIN LATERAL (
    -- Subject's own programme
    SELECT sub.programme AS programme
    UNION
    -- Programmes that reference this subject via programme structures
    SELECT ps.programme
    FROM program_structure_courses psc
    JOIN program_structures ps ON psc.structure_id = ps.id
    WHERE psc.subject_id = sub.id
) all_progs
ON CONFLICT (programme, section_id) DO NOTHING;

-- Comment for documentation
COMMENT ON TABLE programme_section_links IS 'Visibility layer: controls which programmes can see which sections. Sections are shared; links act as per-programme bookmarks.';
