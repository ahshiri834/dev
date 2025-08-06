<?php

it('returns healthy status', function () {
    $this->get('/health')
        ->assertOk()
        ->assertJson(['status' => 'healthy']);
});
