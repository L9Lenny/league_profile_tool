
$labels = @(
    @{ name = 'Type: Bug'; color = 'd73a4a'; description = 'Something isn''t working' },
    @{ name = 'Type: Feature'; color = 'a2eeef'; description = 'New feature or request' },
    @{ name = 'Type: Refinement'; color = 'c89b3c'; description = 'Visual or UX improvement' },
    @{ name = 'Hextech: UI'; color = '0ac1ff'; description = 'Frontend and styling' },
    @{ name = 'Hextech: Backend'; color = '785a28'; description = 'Rust and LCU logic' },
    @{ name = 'Priority: High'; color = 'e99695'; description = 'High priority task' },
    @{ name = 'Status: In Progress'; color = 'fef2c0'; description = 'Work is underway' }
)

foreach ($l in $labels) {
    Write-Host 'Creating label: ' $l.name
    gh label create $l.name --color $l.color --description $l.description --force
}

